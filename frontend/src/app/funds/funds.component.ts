import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../auth/auth.service";
import { SupabaseClient } from "@supabase/supabase-js";
import { SearchResult, FundDetails, MutualFund } from "../shared/types";
import { AutoCompleteModule } from "primeng/autocomplete";
import { TableModule } from "primeng/table";

@Component({
  selector: "app-funds",
  templateUrl: "./funds.component.html",
  styleUrls: ["./funds.component.css"],
  standalone: true,
  imports: [CommonModule, AutoCompleteModule, TableModule],
})
export class FundsComponent implements OnInit {
  searchResults: SearchResult[] = [];
  selectedFund: string | null = null;
  fundDetails: FundDetails | null = null;
  funds: MutualFund[] = [];

  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = authService.getClient();
  }

  async ngOnInit(): Promise<void> {
    await this.getFunds();
  }

  searchFunds(event: any): void {
    if (event.query.length < 4) {
      this.searchResults = [];
      return;
    }
    const url = `https://api.mfapi.in/mf/search?q=${event.query}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        this.searchResults = data;
      })
      .catch((error) => console.error("Error searching funds:", error));
  }

  onSelectedFund(event: any) {
    console.log("onSelectedFund", event);
    this.selectFund(event.value.schemeCode);
  }

  selectFund(schemeCode: string): void {
    this.selectedFund = schemeCode;
    console.log("schemeCode", schemeCode);
    this.getFundDetails(this.selectedFund);
  }

  getFundDetails(schemeCode: string): void {
    const url = `https://api.mfapi.in/mf/${schemeCode}/latest`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.data && data.data.length > 0) {
          this.fundDetails = {
            schemeName: data.meta.scheme_name,
            nav: data.data[0].nav,
            date: data.data[0].date,
          };
        } else {
          this.fundDetails = null;
        }
      })
      .catch((error) => console.error("Error getting fund details:", error));
  }

  async getFunds(): Promise<void> {
    try {
      let { data: mutual_funds, error } = await this.supabase
        .from("mutual_funds")
        .select("*");

      if (error) {
        console.error("Error fetching funds:", error);
      } else {
        console.log("Funds fetched successfully!", mutual_funds);
        this.funds = mutual_funds as MutualFund[];
      }
    } catch (error) {
      console.error("Error fetching funds:", error);
    }
  }

  async saveFund() {
    if (this.fundDetails) {
      try {
        const { data: existingFund, error: existingFundError } =
          await this.supabase
            .from("mutual_funds")
            .select("*")
            .eq("fund_code", this.selectedFund);

        if (existingFundError) {
          console.error("Error checking existing fund:", existingFundError);
          return;
        }

        if (existingFund && existingFund.length > 0) {
          alert("Fund already exists!");
          return;
        }

        const { data, error } = await this.supabase
          .from("mutual_funds")
          .insert([
            {
              fund_name: this.fundDetails.schemeName,
              fund_code: this.selectedFund,
              other_details: JSON.stringify(this.fundDetails),
            },
          ]);

        if (error) {
          console.error("Error saving fund:", error);
        } else {
          console.log("Fund saved successfully!");
          alert("Fund saved successfully!");
          await this.getFunds();
        }
      } catch (error) {
        console.error("Error saving fund:", error);
      }
    }
  }
}
