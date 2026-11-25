const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const User = require("../src/models/User");
const Request = require("../src/models/Request");
const BloodBankLocation = require("../src/models/BloodBankLocation");
const DonationAppointment = require("../src/models/DonationAppointment");
const Notification = require("../src/models/Notification");

const authController = require("../src/controllers/authController");
const donorController = require("../src/controllers/donorController");
const recipientController = require("../src/controllers/recipientController");
const adminController = require("../src/controllers/adminController");
const { errorHandler } = require("../src/middleware/errorHandler");
const {
  classifyStockLevel,
  escapeRegex,
  parseLocalDate,
} = require("../src/utils/inventoryHelper");
const {
  getCompatibleDonorTypes,
  getCompatibleRecipientTypesForDonor,
} = require("../src/utils/compatibility");

// Lightweight stub tracker to restore all Mongoose method stubs after each test
const restores = [];
function stub(obj, method, impl) {
  const original = obj[method];
  obj[method] = impl;
  restores.push(() => {
    obj[method] = original;
  });
}

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()();
  }
});

function createRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, val, opts) {
      this.cookies[name] = { val, opts };
      return this;
    },
    clearCookie(name) {
      delete this.cookies[name];
      return this;
    },
  };
}

// Helper for chainable Mongoose queries like .find().sort().populate().lean()
function mockQuery(result) {
  const q = {
    sort() { return q; },
    limit() { return q; },
    populate() { return q; },
    select() { return q; },
    lean() { return Promise.resolve(result); },
    exec() { return Promise.resolve(result); },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return q;
}

describe("Shared utilities & compatibility", () => {
  it("classifies stock levels consistently across portals", () => {
    assert.equal(classifyStockLevel(0, 50).level, "EMPTY");
    assert.equal(classifyStockLevel(0, 50).isLowOrEmpty, true);
    assert.equal(classifyStockLevel(15, 50).level, "LOW"); // 30%
    assert.equal(classifyStockLevel(15, 50).isLowOrEmpty, true);
    assert.equal(classifyStockLevel(25, 50).level, "MEDIUM"); // 50%
    assert.equal(classifyStockLevel(25, 50).isLowOrEmpty, false);
    assert.equal(classifyStockLevel(40, 50).level, "HIGH"); // 80%
  });

  it("escapes regex metacharacters safely", () => {
    const escaped = escapeRegex("[invalid(test)*+?^$");
    assert.doesNotThrow(() => new RegExp(escaped, "i"));
    assert.equal(new RegExp(escaped, "i").test("[invalid(test)*+?^$"), true);
  });

  it("parses YYYY-MM-DD into local midnight without day shift", () => {
    const dt = parseLocalDate("2026-11-26");
    assert.equal(dt.getFullYear(), 2026);
    assert.equal(dt.getMonth(), 10); // Nov = 10
    assert.equal(dt.getDate(), 26);
  });

  it("computes blood compatibility correctly", () => {
    assert.deepEqual(getCompatibleDonorTypes("O-"), ["O-"]);
    assert.equal(getCompatibleDonorTypes("AB+").length, 8);
    assert.equal(getCompatibleRecipientTypesForDonor("O-").length, 8);
  });
});

describe("Error handler middleware", () => {
  it("returns 400 for ValidationError, CastError, and duplicate key 11000", () => {
    const res1 = createRes();
    errorHandler(
      { name: "ValidationError", errors: { a: { message: "Bad field" } } },
      {},
      res1,
      () => {}
    );
    assert.equal(res1.statusCode, 400);

    const res2 = createRes();
    errorHandler({ name: "CastError", path: "_id" }, {}, res2, () => {});
    assert.equal(res2.statusCode, 400);

    const res3 = createRes();
    errorHandler({ code: 11000, keyValue: { email: "a@b.com" } }, {}, res3, () => {});
    assert.equal(res3.statusCode, 400);
  });
});

describe("Auth controller", () => {
  it("rejects recipient registration with short password (< 6 chars)", async () => {
    const req = {
      body: { name: "Ali", email: "ali@test.com", password: "123", bloodType: "A+" },
    };
    const res = createRes();
    await authController.registerRecipient(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /at least 6 characters/i);
  });

  it("normalizes email casing/whitespace during recipient registration duplicate check", async () => {
    let queriedEmail = null;
    stub(User, "findOne", async (query) => {
      queriedEmail = query.email;
      return { _id: "existing" };
    });

    const req = {
      body: {
        name: "Ali",
        email: "  Ali@Test.COM ",
        password: "password123",
        bloodType: "A+",
      },
    };
    const res = createRes();
    await authController.registerRecipient(req, res, () => {});
    assert.equal(queriedEmail, "ali@test.com");
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /already registered/i);
  });
});

describe("Donor controller business logic", () => {
  it("marks donor ineligible if age or weight is missing", () => {
    const result = donorController._buildEligibility(
      { age: undefined, weight: undefined },
      null
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reasons.length, 2);
  });

  it("prevents booking a second SCHEDULED appointment", async () => {
    stub(BloodBankLocation, "findById", async () => ({
      _id: "loc1",
      name: "City Bank",
      isActive: true,
    }));
    stub(User, "findById", async () => ({
      _id: "donor1",
      age: 25,
      weight: 65,
      bloodType: "O+",
    }));
    stub(DonationAppointment, "findOne", async (q) => {
      if (q.status === "SCHEDULED") return { _id: "existingAppt", status: "SCHEDULED" };
      return null;
    });

    const tomorrow = new Date(Date.now() + 86400000);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const req = {
      user: { _id: "donor1" },
      body: { locationId: "loc1", date: dateStr, timeSlot: "10:00" },
    };
    const res = createRes();
    await donorController.createDonationAppointment(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /already have a scheduled/i);
  });

  it("enforces 56-day cooldown from latest completed donation even if user.nextEligibleDonationDate is stale", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let savedUser = false;
    stub(User, "findById", async () => ({
      _id: "donor1",
      age: 28,
      weight: 70,
      bloodType: "A+",
      nextEligibleDonationDate: new Date("2024-01-01"), // stale past date!
      async save() {
        savedUser = true;
      },
    }));
    stub(DonationAppointment, "findOne", () =>
      mockQuery({ _id: "don1", status: "COMPLETED", date: yesterday })
    );
    stub(DonationAppointment, "find", () => mockQuery([{ unitsDonated: 1 }]));
    stub(DonationAppointment, "countDocuments", async () => 0);

    const req = { user: { _id: "donor1" } };
    const res = createRes();
    await donorController.getDonorOverview(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(savedUser, true);
    assert.equal(res.body.eligibility.eligible, false);
    assert.equal(res.body.stats.totalDonations, 1);
    assert.equal(res.body.stats.totalUnitsDonated, 1);
  });

  it("recommends locations with missing/0 inventory for donor's blood type", async () => {
    stub(BloodBankLocation, "find", () =>
      mockQuery([
        { _id: "loc1", name: "Empty Bank", isActive: true, inventory: [] },
        {
          _id: "loc2",
          name: "Full Bank",
          isActive: true,
          inventory: [{ bloodType: "A+", units: 45, capacity: 50 }],
        },
      ])
    );

    const req = { user: { _id: "d1", bloodType: "A+" } };
    const res = createRes();
    await donorController.getDonorLocations(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.locations[0].stockLevel, "LOW");
    assert.equal(res.body.locations[0].isRecommended, true);
    assert.equal(res.body.locations[1].stockLevel, "HIGH");
    assert.equal(res.body.locations[1].isRecommended, false);
  });
});

describe("Recipient controller business logic", () => {
  it("rejects blood request when location has empty inventory []", async () => {
    stub(BloodBankLocation, "findById", () =>
      mockQuery({ _id: "loc1", name: "Empty Bank", isActive: true, inventory: [] })
    );
    stub(Request, "aggregate", async () => []);

    const req = {
      user: { _id: "rec1" },
      body: { bloodType: "A+", units: 2, urgency: "HIGH", locationId: "loc1" },
    };
    const res = createRes();
    await recipientController.createBloodRequest(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /not have enough available stock/i);
  });

  it("rejects fractional units in blood request", async () => {
    const req = {
      user: { _id: "rec1" },
      body: { bloodType: "A+", units: 1.5, urgency: "MEDIUM", locationId: "loc1" },
    };
    const res = createRes();
    await recipientController.createBloodRequest(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /positive whole number/i);
  });

  it("notifies compatible donors when an emergency blood request is created", async () => {
    stub(BloodBankLocation, "findById", () =>
      mockQuery({
        _id: "loc1",
        name: "City Bank",
        city: "Lahore",
        isActive: true,
        inventory: [{ bloodType: "A+", units: 10, capacity: 50 }],
      })
    );
    stub(Request, "aggregate", async () => []);
    stub(Request, "create", async (data) => ({ _id: "req1", ...data }));

    let recipientNotif = null;
    stub(Notification, "create", async (doc) => {
      recipientNotif = doc;
      return doc;
    });

    stub(User, "find", () => mockQuery([{ _id: "donorA" }, { _id: "donorO" }]));
    let donorNotifs = [];
    stub(Notification, "insertMany", async (docs) => {
      donorNotifs = docs;
      return docs;
    });

    const req = {
      user: { _id: "rec1" },
      body: {
        bloodType: "A+",
        units: 2,
        urgency: "HIGH",
        locationId: "loc1",
        isEmergency: true,
      },
    };
    const res = createRes();
    await recipientController.createBloodRequest(req, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(recipientNotif.role, "RECIPIENT");
    assert.equal(donorNotifs.length, 2);
    assert.equal(donorNotifs[0].type, "MATCHING_REQUEST");
  });

  it("excludes empty-inventory locations from getLocationsForRecipient", async () => {
    stub(BloodBankLocation, "find", () =>
      mockQuery([
        { _id: "loc1", name: "Empty Bank", isActive: true, inventory: [] },
        {
          _id: "loc2",
          name: "Stocked Bank",
          isActive: true,
          phone: "0300-111",
          inventory: [{ bloodType: "O-", units: 3 }],
        },
      ])
    );

    const req = { query: { bloodType: "O-" } };
    const res = createRes();
    await recipientController.getLocationsForRecipient(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.locations.length, 1);
    assert.equal(res.body.locations[0].name, "Stocked Bank");
    assert.equal(res.body.locations[0].contactNumber, "0300-111");
  });

  it("picks lastReceived sorted by fulfilledAt rather than createdAt", async () => {
    stub(Request, "find", () =>
      mockQuery([
        {
          _id: "r2",
          bloodType: "B+",
          units: 1,
          status: "FULFILLED",
          createdAt: new Date("2026-11-10"),
          fulfilledAt: new Date("2026-11-11"),
          location: { name: "Bank B" },
        },
        {
          _id: "r1",
          bloodType: "A+",
          units: 2,
          status: "FULFILLED",
          createdAt: new Date("2026-11-01"),
          fulfilledAt: new Date("2026-11-20"), // fulfilled MORE recently!
          location: { name: "Bank A" },
        },
      ])
    );

    const req = { user: { _id: "rec1" } };
    const res = createRes();
    await recipientController.getRecipientRequestHistory(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.summary.lastReceived.locationName, "Bank A");
  });
});

describe("Admin controller business logic", () => {
  it("handles regex metacharacters in donor search and prioritizes SCHEDULED over later CANCELLED appointment", async () => {
    stub(User, "find", () =>
      mockQuery([{ _id: "d1", name: "Sara", email: "sara@test.com", totalDonations: 0 }])
    );
    stub(DonationAppointment, "find", () =>
      mockQuery([
        {
          _id: "a2",
          donor: "d1",
          status: "CANCELLED",
          date: new Date("2026-12-10"),
          timeSlot: "10:00",
          location: { name: "Bank 2" },
        },
        {
          _id: "a1",
          donor: "d1",
          status: "SCHEDULED",
          date: new Date("2026-12-01"),
          timeSlot: "09:00",
          location: { name: "Bank 1" },
        },
      ])
    );

    const req = { query: { search: "[invalid" } };
    const res = createRes();
    await adminController.getAdminDonorsList(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.donors[0].latestAppointment.id, "a1");
    assert.equal(res.body.donors[0].latestAppointment.status, "SCHEDULED");
  });

  it("completing donation updates inventory atomically, resets 56-day cooldown, and notifies donor", async () => {
    const apptDate = new Date("2026-11-25");
    const apptDoc = {
      _id: "appt1",
      status: "SCHEDULED",
      date: apptDate,
      timeSlot: "10:00",
      unitsDonated: 1,
      donor: { _id: "d1", bloodType: "O+", name: "Sara" },
      location: {
        _id: "loc1",
        name: "City Bank",
        city: "Lahore",
        inventory: [{ bloodType: "O+", units: 10, capacity: 50 }],
      },
      async save() {
        return this;
      },
    };

    stub(DonationAppointment, "findById", () => mockQuery(apptDoc));

    let atomicFilter = null;
    let atomicUpdate = null;
    stub(BloodBankLocation, "findOneAndUpdate", async (filter, update) => {
      atomicFilter = filter;
      atomicUpdate = update;
      return { _id: "loc1" };
    });

    let userUpdate = null;
    stub(User, "findByIdAndUpdate", async (_id, update) => {
      userUpdate = update;
      return {};
    });

    let donorNotif = null;
    stub(Notification, "create", async (doc) => {
      donorNotif = doc;
      return doc;
    });

    const req = { params: { id: "appt1" }, body: {} };
    const res = createRes();
    await adminController.markDonationAppointmentCompleted(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.appointment.status, "COMPLETED");
    assert.deepEqual(atomicUpdate, { $inc: { "inventory.$.units": 1 } });
    assert.equal(atomicFilter.inventory.$elemMatch.bloodType, "O+");
    assert.equal(userUpdate.$inc.totalDonations, 1);
    assert.ok(userUpdate.$set.nextEligibleDonationDate instanceof Date);
    assert.equal(donorNotif.type, "DONATION_COMPLETED");
  });

  it("blocks completing donation if it would exceed location capacity", async () => {
    const apptDoc = {
      _id: "appt1",
      status: "SCHEDULED",
      date: new Date("2026-11-25"),
      timeSlot: "10:00",
      unitsDonated: 2,
      donor: { _id: "d1", bloodType: "O+" },
      location: {
        _id: "loc1",
        name: "Full Bank",
        inventory: [{ bloodType: "O+", units: 49, capacity: 50 }],
      },
    };
    stub(DonationAppointment, "findById", () => mockQuery(apptDoc));

    const req = { params: { id: "appt1" }, body: {} };
    const res = createRes();
    await adminController.markDonationAppointmentCompleted(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /exceed.*capacity/i);
  });

  it("blocks approving a request when available stock is already reserved by other APPROVED requests", async () => {
    const reqDoc = {
      _id: "req2",
      recipient: "rec1",
      bloodType: "A-",
      units: 3,
      urgency: "HIGH",
      status: "PENDING",
      location: { _id: "loc1", name: "City Bank", city: "Lahore" },
      async save() { return this; },
    };
    stub(Request, "findById", () => mockQuery(reqDoc));
    stub(BloodBankLocation, "findById", () =>
      mockQuery({
        _id: "loc1",
        name: "City Bank",
        inventory: [{ bloodType: "A-", units: 4, capacity: 50 }],
      })
    );
    // 2 units already reserved by another APPROVED request -> only 2 unreserved < 3 requested
    stub(Request, "aggregate", async () => [{ _id: null, reservedUnits: 2 }]);

    const req = { params: { id: "req2" }, body: { status: "APPROVED" } };
    const res = createRes();
    await adminController.adminUpdateRequestStatus(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /not enough unreserved stock/i);
  });

  it("atomically decrements inventory and notifies recipient when fulfilling a request", async () => {
    const reqDoc = {
      _id: "req1",
      recipient: "rec1",
      bloodType: "A+",
      units: 2,
      urgency: "HIGH",
      status: "APPROVED",
      isEmergency: false,
      location: { _id: "loc1", name: "City Bank", city: "Lahore" },
      async save() { return this; },
    };
    stub(Request, "findById", () => mockQuery(reqDoc));

    let decUpdate = null;
    stub(BloodBankLocation, "findOneAndUpdate", async (_filter, update) => {
      decUpdate = update;
      return { _id: "loc1" };
    });

    let notif = null;
    stub(Notification, "create", async (doc) => {
      notif = doc;
      return doc;
    });

    const req = { params: { id: "req1" }, body: { action: "COMPLETE" } };
    const res = createRes();
    await adminController.adminUpdateRequestStatus(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.request.status, "FULFILLED");
    assert.deepEqual(decUpdate, { $inc: { "inventory.$.units": -2 } });
    assert.equal(notif.role, "RECIPIENT");
    assert.match(notif.title, /fulfilled/i);
  });

  it("returns lowOrEmptyCount and totalLocations in getAdminInventoryByLocation", async () => {
    stub(BloodBankLocation, "find", () =>
      mockQuery([
        {
          _id: "loc1",
          name: "City Bank",
          inventory: [
            { bloodType: "A+", units: 40, capacity: 50 }, // HIGH
            { bloodType: "O+", units: 25, capacity: 50 }, // MEDIUM
            { bloodType: "O-", units: 5, capacity: 50 }, // LOW
            // remaining 5 blood types are EMPTY
          ],
        },
      ])
    );

    const res = createRes();
    await adminController.getAdminInventoryByLocation({}, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.totalLocations, 1);
    assert.equal(res.body.locations[0].lowOrEmptyCount, 6); // 1 LOW + 5 EMPTY
  });
});
