import { Injectable } from "@angular/core";
import { environment } from "../../../environnments/environment";

@Injectable({ providedIn: 'root' })
export class ApiConfig {
  private readonly baseUrl = environment.apiUrl || 'http://localhost:9000/api/v1';
  private readonly apiDocUrl = `${this.baseUrl}/v3/api-docs`;

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiDocUrl(): string {
    return this.apiDocUrl;
  }

  getEndpoint(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}