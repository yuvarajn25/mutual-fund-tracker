import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { AuthService } from "../auth/auth.service";
import { SupabaseClient } from "@supabase/supabase-js";
import * as Papa from "papaparse";
import { ParseResult } from "papaparse";
import { firstValueFrom } from "rxjs";
import {
  Transaction,
  MutualFund,
  FailedTransaction,
  CsvTransactionData,
} from "../shared/types";
import { TagModule } from "primeng/tag";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { HttpClientModule } from "@angular/common/http";
import { InputTextModule } from "primeng/inputtext";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectModule } from "primeng/select";
import { Table, TableFilterEvent, TableModule } from "primeng/table";
import { Dialog } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { FilterMatchMode } from "primeng/api";

@Component({
  selector: "app-transactions",
  templateUrl: "./transactions.component.html",
  styleUrls: ["./transactions.component.css"],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TableModule,
    ButtonModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    HttpClientModule,
    InputTextModule,
    TagModule,
    SelectModule,
    MultiSelectModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    Dialog,
  ],
})
export class TransactionsComponent implements OnInit {
  private supabase: SupabaseClient;

  transactions: Transaction[] = [];
  funds: MutualFund[] = [];
  failedTransactions: FailedTransaction[] = [];
  tempTransactions: Transaction[] = [];

  selectedTransaction: Transaction | null = null;
  selectedStatuses: string[] = [];
  selectedTransactionTypes: string[] = [];

  showModal = false;
  searchValue = "";
  filters: any | undefined;
  first = 0;
  rows = 10;
  totalRecords: number = 0;

  transactionForm: FormGroup;
  csvData: CsvTransactionData[] = [];
  statusOptions: string[] = ["HOLD", "SOLD"];

  statuses = [
    { label: "HOLD", value: "HOLD" },
    { label: "SOLD", value: "SOLD" },
  ];

  platform = [
    { label: "ICICI", value: "ICICI" },
    { label: "GROWW", value: "GROWW" },
    { label: "Coin", value: "Coin" },
  ];

  @ViewChild("csvFileInput") csvFileInput: ElementRef | undefined;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
  ) {
    this.supabase = authService.getClient();
    this.transactionForm = this.fb.group({
      fund_id: ["", Validators.required],
      transaction_date: ["", Validators.required],
      transaction_type: ["", Validators.required],
      units: ["", Validators.required],
      price: ["", Validators.required],
      platform: [""],
    });
  }

  ngOnInit(): void {
    this.getFunds();
    this.getTransactions();
  }

  // Data Fetching
  async getFunds(): Promise<void> {
    try {
      const { data: funds, error } = await this.supabase
        .from("mutual_funds")
        .select("*");

      if (error) {
        console.error("Error fetching funds:", error);
      } else {
        this.funds = funds || [];
      }
    } catch (error) {
      console.error("Error fetching funds:", error);
    }
  }

  async getTransactions(): Promise<void> {
    let query = this.supabase.from("transactions").select(`
          *,
          mutual_funds (
            fund_name
          )
        `);

    if (this.selectedStatuses.length > 0) {
      query = query.in("status", this.selectedStatuses);
    }

    if (this.selectedTransactionTypes.length > 0) {
      query = query.in("transaction_type", this.selectedTransactionTypes);
    }

    try {
      const { data: transactions, error } = await query.select(`
          *,
          mutual_funds (
            fund_name
          )
            fund_name
          )
        `);

      if (error) {
        console.error("Error fetching transactions:", error);
      } else {
        this.transactions = (transactions as unknown as Transaction[]) || [];
        this.tempTransactions = this.transactions.slice(
          this.first,
          this.first + this.rows,
        );
        this.totalRecords = this.transactions.length;
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  getTransactionsData() {
    let filteredTrasnsactions = this.transactions;
    for (let columnKey of Object.keys(this.filters || {})) {
      const { value, matchMode } =
        (this.filters?.[columnKey] as Array<any>)?.[0] || {};
      console.log({ value, matchMode }, columnKey, this.filters?.[columnKey]);
      if (!value) continue;
      if (matchMode === FilterMatchMode.IN) {
        filteredTrasnsactions = filteredTrasnsactions.filter((transaction) =>
          value.map((v: any) => v.value).includes(transaction.status),
        );
      }
    }
    this.tempTransactions = filteredTrasnsactions.slice(
      this.first,
      this.first + this.rows,
    );
    this.totalRecords = filteredTrasnsactions.length;
  }

  // CSV Processing
  handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.parseCSV(file);
    }
  }

  parseCSV(file: File): void {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: ParseResult<CsvTransactionData>) => {
        this.csvData = result.data;
        console.log("Parsed CSV Data:", this.csvData);
        this.mapFundCodesToIds();
      },
      error: (error: Error) => {
        console.error("Error parsing CSV:", error.message);
      },
    });
  }

  mapFundCodesToIds(): void {
    this.csvData = this.csvData
      .map((transaction: CsvTransactionData) => {
        const fund = this.funds.find(
          (fund) => fund.fund_code === transaction.fund_code,
        );
        if (fund) {
          return {
            ...transaction,
            fund_id: fund.fund_id,
          };
        } else {
          console.warn(
            `Fund code ${transaction.fund_code} not found. Transaction will be skipped.`,
          );
          this.failedTransactions.push({
            ...transaction,
            error: `Fund code ${transaction.fund_code} not found`,
          });
          return null;
        }
      })
      .filter((transaction) => transaction !== null) as CsvTransactionData[];
  }

  async uploadTransactions(): Promise<void> {
    if (this.csvData.length === 0) {
      console.warn("No transactions to upload.");
      return;
    }
    this.failedTransactions = [];
    try {
      for (const transaction of this.csvData) {
        const { data, error } = await this.supabase
          .from("transactions")
          .insert([
            {
              fund_id: transaction.fund_id,
              transaction_date: transaction.transaction_date,
              transaction_type: transaction.transaction_type.toUpperCase(),
              units: transaction.units,
              price: transaction.price,
              platform: transaction.platform,
            },
          ]);

        if (error) {
          console.error("Error creating transaction:", transaction, error);
          this.failedTransactions.push({
            ...transaction,
            error: error.message,
          });
        } else {
          console.log("Transaction created successfully!");
        }
      }
      await this.getTransactions();
      this.csvData = [];
    } catch (error) {
      console.error("Error uploading transactions:", error);
    } finally {
      if (this.csvFileInput) {
        this.csvFileInput.nativeElement.value = "";
      }
    }
  }

  // Modal Operations
  openModal(transaction?: Transaction): void {
    this.selectedTransaction = transaction || null;
    if (transaction) {
      this.transactionForm.patchValue(transaction);
    } else {
      this.transactionForm.reset();
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedTransaction = null;
  }

  async saveTransaction(): Promise<void> {
    console.log(this.transactionForm);
    if (this.transactionForm.valid) {
      const transaction = this.transactionForm.value;
      try {
        if (this.selectedTransaction) {
          const { data, error } = await this.supabase
            .from("transactions")
            .update(transaction)
            .eq("transaction_id", this.selectedTransaction.transaction_id);

          if (error) {
            console.error("Error updating transaction:", error);
          } else {
            console.log("Transaction updated successfully!");
            this.closeModal();
            await this.getTransactions();
          }
        } else {
          console.log("trasaction", transaction);
          const { data, error } = await this.supabase
            .from("transactions")
            .insert([transaction]);

          if (error) {
            console.error("Error creating transaction:", error);
          } else {
            console.log("Transaction created successfully!");
            this.closeModal();
            await this.getTransactions();
          }
        }
      } catch (error) {
        console.error("Error saving transaction:", error);
      }
    }
  }

  // Table Operations
  clear(table: Table) {
    table.clear();
    this.searchValue = "";
  }

  pageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.getTransactionsData();
  }

  onFilterChange(event: TableFilterEvent) {
    this.filters = event.filters;
    this.getTransactionsData();
  }

  // Transaction Management
  async deleteTransaction(transactionId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from("transactions")
        .delete()
        .eq("transaction_id", transactionId);

      if (error) {
        console.error("Error deleting transaction:", error);
      } else {
        console.log("Transaction deleted successfully!");
        await this.getTransactions();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  }
}
