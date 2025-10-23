import { Component, OnInit } from '@angular/core';
import { Api } from '../api';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {

  dados: any[] = [];
  historico: any[] = [];

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.carregarDados();
    this.carregarHistorico();
  }

  carregarDados(): void {
    this.apiService.getSensores().subscribe({
      next: (data: any[]) => {
        console.log('Sensores:', data);
        this.dados = data;
      },
      error: (erro) => {
        console.error('Erro sensores:', erro);
      }
    });
  }

  carregarHistorico(): void {
    const collection = 'gA5kPz7RqL2mS8vBwT9E';
    const data = '2025-10-23'; // se quiser tudo, deixe undefined ou string vazia

    this.apiService.getHistoricoDia(collection, data).subscribe({
      next: (res: any[]) => {
        console.log('Histórico recebido:', res);
        this.historico = res;
      },
      error: (erro) => {
        console.error('Erro histórico:', erro);
      }
    });
  }
}
