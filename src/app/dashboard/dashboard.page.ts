import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  dados: any[] = [];
  historico: any[] = [];
  dataSelecionada: string = '';
  carregando = false;
  chart: any;
  
  intervaloAtualizacao: any;
  tempoAtualizacao = 10000;
  autoRefreshAtivo = true;

  private readonly BASE_URL = 'https://esp32-mongodb-idev3.onrender.com';
  private readonly COLLECTION = 'gA5kPz7RqL2mS8vBwT9E';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.buscarLeiturasAtuais();
    this.buscarTodosOsDados();
    this.iniciarAutoRefresh();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.historico.length > 0) {
        this.renderizarGrafico();
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.pararAutoRefresh();
  }

  iniciarAutoRefresh() {
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
    }

    this.intervaloAtualizacao = setInterval(() => {
      if (this.autoRefreshAtivo) {
        console.log('🔄 Atualizando dados automaticamente...');
        
        if (this.dataSelecionada) {
          this.buscarHistoricoPorData(true);
        } else {
          this.buscarTodosOsDados(true);
        }
      }
    }, this.tempoAtualizacao);

    console.log(`✅ Auto-refresh ativado (a cada ${this.tempoAtualizacao / 1000}s)`);
  }

  pararAutoRefresh() {
    if (this.intervaloAtualizacao) {
      clearInterval(this.intervaloAtualizacao);
      this.intervaloAtualizacao = null;
      console.log('⏸️ Auto-refresh pausado');
    }
  }

  toggleAutoRefresh() {
    this.autoRefreshAtivo = !this.autoRefreshAtivo;
    
    if (this.autoRefreshAtivo) {
      console.log('▶️ Auto-refresh retomado');
      if (this.dataSelecionada) {
        this.buscarHistoricoPorData(true);
      } else {
        this.buscarTodosOsDados(true);
      }
    } else {
      console.log('⏸️ Auto-refresh pausado pelo usuário');
    }
  }

  atualizarManualmente() {
    console.log('🔄 Atualização manual disparada');
    if (this.dataSelecionada) {
      this.buscarHistoricoPorData(false);
    } else {
      this.buscarTodosOsDados(false);
    }
  }

  alterarTempoAtualizacao(segundos: number) {
    this.tempoAtualizacao = segundos * 1000;
    console.log(`⏱️ Tempo alterado para ${segundos}s`);
    
    if (this.autoRefreshAtivo) {
      this.iniciarAutoRefresh();
    }
  }

  async buscarLeiturasAtuais() {
    try {
      const resposta = await this.http
        .get<any[]>(`${this.BASE_URL}/api/leituras/${this.COLLECTION}`)
        .toPromise();
      this.dados = resposta || [];
    } catch (err) {
      console.error('Erro ao buscar leituras:', err);
    }
  }

  async buscarTodosOsDados(silencioso = false) {
    if (!silencioso) {
      this.carregando = true;
    }
    
    try {
      const resposta = await this.http
        .get<any[]>(`${this.BASE_URL}/api/historico-todos/${this.COLLECTION}`)
        .toPromise();
      
      const novosRegistros = Array.isArray(resposta) ? resposta.length : 0;
      const registrosAntigos = this.historico.length;
      
      this.historico = Array.isArray(resposta) ? resposta : [];
      
      if (silencioso && novosRegistros > registrosAntigos) {
        console.log(`🆕 ${novosRegistros - registrosAntigos} novos registros detectados!`);
      }
      
      setTimeout(() => this.renderizarGrafico(), 500);
    } catch (err) {
      console.error('❌ Erro ao buscar todos os dados:', err);
      this.historico = [];
    } finally {
      if (!silencioso) {
        this.carregando = false;
      }
    }
  }

  async buscarHistoricoPorData(silencioso = false) {
    if (!this.dataSelecionada) {
      this.buscarTodosOsDados(silencioso);
      return;
    }

    if (!silencioso) {
      this.carregando = true;
    }
    
    const dataISO = new Date(this.dataSelecionada);
    const dataFormatada = dataISO.toISOString().split('T')[0];
    const url = `${this.BASE_URL}/api/historico-dia/${this.COLLECTION}?data=${dataFormatada}`;

    try {
      const resposta = await this.http.get<any[]>(url).toPromise();
      
      const novosRegistros = Array.isArray(resposta) ? resposta.length : 0;
      const registrosAntigos = this.historico.length;
      
      this.historico = Array.isArray(resposta) ? resposta : [];
      
      if (silencioso && novosRegistros > registrosAntigos) {
        console.log(`🆕 ${novosRegistros - registrosAntigos} novos registros do dia ${dataFormatada}!`);
      }
      
      setTimeout(() => this.renderizarGrafico(), 300);
    } catch (err) {
      console.error('❌ Erro ao buscar histórico filtrado:', err);
      this.historico = [];
    } finally {
      if (!silencioso) {
        this.carregando = false;
      }
    }
  }

  aoMudarData(event: any) {
    this.dataSelecionada = event.detail.value || '';
    this.buscarHistoricoPorData();
  }

  renderizarGrafico() {
    const canvas = document.getElementById('graficoHistorico') as HTMLCanvasElement;
    
    if (!canvas) {
      console.log('⚠️ Canvas não encontrado');
      return;
    }

    if (this.historico.length === 0) {
      console.log('⚠️ Sem dados para renderizar');
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    const dadosOrdenados = [...this.historico].sort((a, b) => {
      const timeA = a.timestamp || a.createdAt || '';
      const timeB = b.timestamp || b.createdAt || '';
      return timeA.localeCompare(timeB);
    });

    const labels = dadosOrdenados.map(d => {
      const ts = d.timestamp || d.createdAt || '';
      if (ts.includes(',')) {
        return ts.split(', ')[1]?.substring(0, 5) || 'N/A';
      }
      return ts.substring(11, 16) || 'N/A';
    });

    const temperaturas = dadosOrdenados.map(d => d.temperatura || 0);
    const umidades = dadosOrdenados.map(d => d.umidade || 0);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '🌡️ Temperatura (°C)',
            data: temperaturas,
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#ff6b6b',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: '💧 Umidade (%)',
            data: umidades,
            borderColor: '#4ecdc4',
            backgroundColor: 'rgba(78, 205, 196, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#4ecdc4',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#fff',
              font: {
                size: 13,
                weight: 'bold',
              },
              padding: 15,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#fff',
            },
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#fff',
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
      },
    });

    console.log('✅ Gráfico renderizado com', labels.length, 'pontos');
  }
}