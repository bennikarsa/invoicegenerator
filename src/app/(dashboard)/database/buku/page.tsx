import { BooksManager } from "@/components/books-manager";
import { PageHeader } from "@/components/page-header";

export default function BukuPage() {
  return (
    <>
      <PageHeader
        title="Database Buku"
        description="Kelola judul buku, harga komunitas, harga jual, dan harga modal khusus admin."
      />
      <BooksManager />
    </>
  );
}
