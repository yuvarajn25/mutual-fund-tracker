import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { AppComponent } from "./app/app.component";
import { createClient } from "@supabase/supabase-js";
import { environment } from "./environments/environment";

const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey,
);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    { provide: "Supabase", useValue: supabase },
  ],
}).catch((err) => console.error(err));
