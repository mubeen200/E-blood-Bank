export function HowItWorksPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">How It Works</h1>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Donors register, check eligibility, and book donation appointments.</li>
        <li>Recipients register and submit blood requests with urgency and location.</li>
        <li>Admins monitor inventory, approve requests, and track dispatches.</li>
        <li>Analytics help optimize stock and understand trends over time.</li>
      </ol>
    </section>
  );
}
