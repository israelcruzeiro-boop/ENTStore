import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

const buildPages = (page: number, totalPages: number) => {
  const first = Math.max(1, page - 2);
  const last = Math.min(totalPages, page + 2);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
};

export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  isLoading = false,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1 && total <= pageSize) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const pages = buildPages(page, safeTotalPages);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Mostrando {start}-{end} de {total}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
          </PaginationItem>
          {pages.map((item) => (
            <PaginationItem key={item}>
              <Button
                type="button"
                variant={item === page ? 'default' : 'ghost'}
                size="sm"
                disabled={isLoading}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </PaginationItem>
          ))}
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= safeTotalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Proxima
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
