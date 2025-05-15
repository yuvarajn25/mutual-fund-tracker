export interface SearchResult {
  schemeCode: string;
  schemeName: string;
}

export interface FundDetails {
  schemeName: string;
  nav: string;
  date: string;
}

export interface MutualFund {
  fund_id?: string;
  created_at?: string;
  fund_name: string;
  fund_code: string;
  other_details: string;
}

export interface Transaction {
  transaction_id?: string;
  created_at?: string;
  fund_id: number;
  transaction_date: string;
  transaction_type: string; // e.g., 'BUY', 'SELL'
  units: number;
  price: number;
  platform?: string;
  status?: string; // e.g., 'HOLD', 'SOLD'
  mutual_funds?: {
    // Nested fund details from join
    fund_name: string;
  } | null;
}

export interface CsvTransactionData {
  fund_code: string;
  transaction_date: string;
  transaction_type: string;
  units: string | number; // Can be string from CSV initially
  price: string | number; // Can be string from CSV initially
  platform?: string;
  fund_id?: number; // Added after mapping
}

export interface FailedTransaction extends CsvTransactionData {
  error: string;
}

export interface MfApiPriceData {
  data: {
    nav: string; // API returns this as string
    date: string;
    // Add other properties if needed from the API response
  }[];
  meta?: {
    scheme_code: string;
    scheme_name: string;
    // Add other meta properties if needed
  };
  status?: string; // Example status field
}

export interface FundSummaryWithNav {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  // Add other properties from the fund_summary table if selected by '*'
  net_units: number; // Based on usage in map
  invested: number;
  profit: number;
  nav_data: {
    nav_value: number; // Supabase might return this as string depending on schema
    nav_date: string;
  }[]; // Array of nested nav_data objects
}
