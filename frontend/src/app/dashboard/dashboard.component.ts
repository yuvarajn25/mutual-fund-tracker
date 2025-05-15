import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../auth/auth.service";
import { SupabaseClient } from "@supabase/supabase-js";
import { MfApiPriceData, FundSummaryWithNav } from "../shared/types";

interface FundSummary {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  unitNavValue: number;
  net_units: number;
  nav: number | null;
}

async function updateNavData(
  supabase: SupabaseClient,
  fund_id: string,
  fund_code: string,
): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at 00:00:00

  try {
    console.log(
      `Updating NAV data for fund_id: ${fund_id}, fund_code: ${fund_code}`,
    );
    // Check if NAV data exists and is up-to-date (today's date)
    const { data: navData, error: navError } = await supabase
      .from("nav_data")
      .select("*")
      .eq("fund_id", fund_id)
      .gte("nav_date", today.toISOString().split("T")[0]); //YYYY-MM-DD format

    if (navError) {
      console.error(`Error fetching NAV data for ${fund_code}:`, navError);
      return;
    }

    if (navData && navData.length > 0) {
      console.log(
        `NAV data for fund_id: ${fund_id}, fund_code: ${fund_code} is up-to-date.`,
      );
      return;
    }

    // Fetch latest NAV from API
    const priceUrl = `https://api.mfapi.in/mf/${fund_code}/latest`;
    const priceResponse = await fetch(priceUrl);
    const priceData: MfApiPriceData = await priceResponse.json();
    const latestNav = priceData?.data?.[0]?.nav;
    let latestNavDate = priceData?.data?.[0]?.date;

    if (latestNavDate) {
      const dateParts = latestNavDate.split("-");
      if (dateParts.length === 3) {
        latestNavDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      } else {
        console.error(`Unexpected date format: ${latestNavDate}`);
      }
    }

    if (latestNav) {
      console.log(
        `Latest NAV for fund_id: ${fund_id}, fund_code: ${fund_code}: ${latestNav}, date: ${latestNavDate}`,
      );
      // Update nav_data table
      const { error: updateError } = await supabase.from("nav_data").upsert(
        {
          fund_id: fund_id,
          nav_value: latestNav,
          nav_date: latestNavDate,
        },
        { onConflict: "fund_id, nav_date" },
      ); // Update if exists, otherwise insert

      if (updateError) {
        console.error(`Error updating NAV data for ${fund_code}:`, updateError);
      } else {
        console.log(`NAV data for ${fund_code} updated successfully.`);
      }
    } else {
      console.warn(`Could not fetch NAV data for ${fund_code} from API.`);
    }
  } catch (error: any) {
    console.error(`Error updating NAV data for ${fund_code}:`, error);
  }
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  fundSummaries: FundSummary[] = [];
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = authService.getClient();
  }

  ngOnInit(): void {
    this.getFundSummaries();
  }

  async getFundSummaries(): Promise<void> {
    try {
      const {
        data: fundSummaries,
        error,
      }: { data: FundSummaryWithNav[] | null; error: any } =
        await this.supabase.from("fund_summary").select(`*,
                    nav_data (
                        nav_value, nav_date
                    )`);

      if (error) {
        console.error("Error fetching fund summaries:", error);
        return;
      }
      // Filter out funds with net_units equal to 0
      this.fundSummaries = (fundSummaries as unknown as FundSummaryWithNav[])
        .filter((summary) => summary.net_units !== 0)
        .map((summary) => ({
          ...summary,
          unitNavValue:
            summary.net_units *
            (summary.nav_data ? summary.nav_data?.[0]?.nav_value : 0),
          nav: summary.nav_data ? summary.nav_data?.[0]?.nav_value : null,
        })) as FundSummary[];

      console.log("Fund Summaries:", this.fundSummaries);

      // Update NAV data for each fund
      for (const summary of this.fundSummaries) {
        await updateNavData(this.supabase, summary.fund_id, summary.fund_code);
      }
    } catch (error: any) {
      console.error("Error fetching fund summaries:", error);
    }
  }
}
