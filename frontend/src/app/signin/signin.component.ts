import { Component, OnInit } from "@angular/core";
import { environment } from "../../environments/environment";
import { createClient } from "@supabase/supabase-js";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-signin",
  templateUrl: "./signin.component.html",
  styleUrls: ["./signin.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
})
export class SigninComponent implements OnInit {
  email = "";
  password = "";
  supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  constructor() {}

  ngOnInit(): void {}

  async signInWithEmail() {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: this.email,
      password: this.password,
    });

    if (error) {
      console.log(error);
      alert(error.message);
    } else {
      alert("Check your email for the login link!");
    }
  }
}
