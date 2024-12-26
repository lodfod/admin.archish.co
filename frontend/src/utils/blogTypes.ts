export type BlogPost = {
    title: string;
    date: string;
    content: string;
    summary: string;
    id: string;
  };

export interface RawBlogPost {
    id: string;
    title: string;
    date: string;
    markdown: string;
    summary: string;
}
  
  