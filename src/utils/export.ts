export class DataExporter {
  static downloadCSV(data: any[], filename: string = 'export.csv'): void {
    this.exportToCSV(data, filename);
  }

  static exportToCSV(data: any[], filename: string = 'export.csv'): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = this.convertToCSV(data, headers);
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static convertToCSV(data: any[], headers: string[]): string {
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        
        if (value === null || value === undefined) {
          return '""';
        }
        
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  static exportToJSON(data: any, filename: string = 'export.json'): void {
    if (!data) {
      console.warn('No data to export');
      return;
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportToExcel(data: any[], filename: string = 'export.xlsx'): void {
    console.warn('Excel export requires additional libraries like xlsx or exceljs');
    this.exportToCSV(data, filename.replace('.xlsx', '.csv'));
  }

  static formatDataForExport(data: any[], columns?: string[]): any[] {
    if (!columns) {
      return data;
    }

    return data.map(item => {
      const exportItem: any = {};
      columns.forEach(col => {
        exportItem[col] = item[col];
      });
      return exportItem;
    });
  }

  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  static formatCurrency(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return '';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return '';
    
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(numAmount);
  }

  static prepareLeadsForExport(leads: any[]): any[] {
    return leads.map(lead => ({
      'ID': lead.id,
      '会社名': lead.company,
      '担当者名': lead.contactName,
      'メールアドレス': lead.email,
      '電話番号': lead.phone,
      'ステータス': lead.status,
      '確度': `${lead.probability}%`,
      '予算': this.formatCurrency(lead.budget),
      '作成日': this.formatDate(lead.createdAt),
      '次回アクション日': this.formatDate(lead.nextAction),
      'メモ': lead.notes || ''
    }));
  }

  static prepareTasksForExport(tasks: any[]): any[] {
    return tasks.map(task => ({
      'ID': task.id,
      'タスク名': task.title,
      '説明': task.description || '',
      'ステータス': task.status,
      '優先度': task.priority,
      '担当者': task.assignee || '',
      '期限': this.formatDate(task.deadline),
      '作成日': this.formatDate(task.createdAt),
      'タグ': Array.isArray(task.tags) ? task.tags.join(', ') : ''
    }));
  }

  static prepareProjectsForExport(projects: any[]): any[] {
    return projects.map(project => ({
      'ID': project.id,
      'プロジェクト名': project.name,
      'クライアント': project.client,
      'ステータス': project.status,
      '開始日': this.formatDate(project.startDate),
      '終了日': this.formatDate(project.endDate),
      '予算': this.formatCurrency(project.budget),
      '進捗率': `${project.progress || 0}%`,
      'チームメンバー': Array.isArray(project.team) ? project.team.join(', ') : '',
      '説明': project.description || ''
    }));
  }

  static importFromCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n');
          const headers = rows[0].split(',').map(h => h.trim());
          const data = [];
          
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim()) {
              const values = this.parseCSVLine(rows[i]);
              const row: any = {};
              
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              
              data.push(row);
            }
          }
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}