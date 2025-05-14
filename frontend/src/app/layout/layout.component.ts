import { Component, OnInit } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { AuthService } from "../auth/auth.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-layout",
  templateUrl: "./layout.component.html",
  styleUrls: ["./layout.component.css"],
  standalone: true,
  imports: [RouterOutlet, CommonModule],
})
export class LayoutComponent implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {}

  async signOut() {
    await this.authService.signOut();
    this.router.navigate(["/signin"]);
  }
}
