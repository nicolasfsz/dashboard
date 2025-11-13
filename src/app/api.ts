// api.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Api {
  private apiUrl: string = "https://esp32-mongodb-idev3.onrender.com";

  constructor(private http: HttpClient) {}

  // trazer todas as leituras da collection fixa (substitua collection se quiser parametrizar)
  getSensores(): Observable<any[]> {
    // sem ":" aqui; passe a collection no caminho real do servidor se necessário
    return this.http.get<any[]>(`${this.apiUrl}/api/leituras/gA5kPz7RqL2mS8vBwT9E`);
  }

  // histórico do dia (data opcional)
  getHistoricoDia(collection: string, data?: string): Observable<any[]> {
    let url = `${this.apiUrl}/api/historico-dia/${collection}`;
    if (data) {
      url += `?data=${encodeURIComponent(data)}`;
    }
    return this.http.get<any[]>(url);
  }
}
