const rows = [
  { recipient: "A+", donors: "A+, A-, O+, O-" },
  { recipient: "A-", donors: "A-, O-" },
  { recipient: "B+", donors: "B+, B-, O+, O-" },
  { recipient: "B-", donors: "B-, O-" },
  { recipient: "AB+", donors: "All blood groups (universal recipient)" },
  { recipient: "AB-", donors: "AB-, A-, B-, O-" },
  { recipient: "O+", donors: "O+, O-" },
  { recipient: "O-", donors: "O- (universal donor)" }
];

export function CompatibilityChartPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Blood Compatibility Chart</h1>
      <p className="text-sm text-muted-foreground">
        Use this chart to understand which blood types are compatible. The system
        will automatically apply this logic when suggesting alternative types and
        locations.
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-4 py-2 text-left">Recipient Type</th>
              <th className="px-4 py-2 text-left">Compatible Donor Types</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.recipient} className="border-b border-slate-800/60">
                <td className="px-4 py-2 font-medium">{row.recipient}</td>
                <td className="px-4 py-2 text-slate-300">{row.donors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
