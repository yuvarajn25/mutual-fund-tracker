import { Routes } from "@angular/router";
import { SigninComponent } from "./signin/signin.component";
import { authGuard } from "./auth.guard";
import { LayoutComponent } from "./layout/layout.component";
import { FundsComponent } from "./funds/funds.component";
import { TransactionsComponent } from "./transactions/transactions.component";
import { DashboardComponent } from "./dashboard/dashboard.component";

export const routes: Routes = [
  { path: "signin", component: SigninComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "funds", component: FundsComponent },
      { path: "transactions", component: TransactionsComponent },
      { path: "dashboard", component: DashboardComponent },
    ],
  },
];
