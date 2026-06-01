export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to CryptoLeads</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Phase 1 complete — database, schema, and layout ready. Dashboard coming in Phase 2.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Total Leads', 'A+ Leads', 'Verified Emails', 'Ready to Contact'].map(label => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">—</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          ✅ Prisma schema with PostgreSQL/Supabase<br />
          ✅ Full keyword seed (300+ keywords, 11 categories)<br />
          ✅ Responsive sidebar + mobile drawer<br />
          ✅ Zod validation schemas<br />
          ✅ TypeScript types and label maps<br />
          ✅ Design tokens and global CSS<br />
          🔜 Phase 2: Dashboard stats + charts<br />
          🔜 Phase 3: Keyword Library CRUD<br />
          🔜 Phase 4: Query Generator<br />
          🔜 Phase 5: Lead CRM Table + Form<br />
        </p>
      </div>
    </div>
  )
}