import { Injectable } from "@angular/core";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();

    return data.session?.user;
  }

  // You can add more methods for user management,
  // password reset, etc. here
}
