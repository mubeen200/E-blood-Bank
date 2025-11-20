// Recipient blood type -> compatible donor blood types
const compatibilityMap = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"]
};

// Given recipient blood type, return all allowed donor types
const getCompatibleDonorTypes = (recipientType) =>
  compatibilityMap[recipientType] || [];

// (Optional helper) given donor type, which recipient types can they donate to?
const getCompatibleRecipientTypesForDonor = (donorType) => {
  const result = [];
  for (const [recipientType, donorTypes] of Object.entries(compatibilityMap)) {
    if (donorTypes.includes(donorType)) {
      result.push(recipientType);
    }
  }
  return result;
};

module.exports = {
  compatibilityMap,
  getCompatibleDonorTypes,
  getCompatibleRecipientTypesForDonor
};
