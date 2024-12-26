export interface BlogPost {
    id: string;
    title: string;
    date: string;
    markdown: string;
    summary: string;
    lastModified?: string;
  }
  
  export interface GenerateSummaryRequest {
    content: string;
  }