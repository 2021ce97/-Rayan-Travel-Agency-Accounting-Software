import { HotelVoucherForm } from "./hotel-voucher-form";
import { asc } from "drizzle-orm";
import { cities, countries, db } from "@/lib/db";

export default async function HotelVoucherPage() {
  const [countryRows, cityRows] = await Promise.all([
    db.select({ id: countries.id, name: countries.name }).from(countries).orderBy(asc(countries.name)),
    db.select({ id: cities.id, countryId: cities.countryId, name: cities.name }).from(cities).orderBy(asc(cities.name)),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Hotel Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Posting this voucher automatically creates the matching double-entry accounting lines.
        </p>
      </div>
      <HotelVoucherForm countries={countryRows} cities={cityRows} />
    </div>
  );
}
