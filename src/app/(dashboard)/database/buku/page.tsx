import { BooksManager } from "@/components/books-manager";
import { PageHeader } from "@/components/page-header";

export default function BukuPage() {
  return (
    <>
      <PageHeader
        title="Database Produk"
        description="Kelola nama produk, harga komunitas, harga jual, dan harga modal khusus admin."
      />
      <BooksManager />
    </>
  );
}
