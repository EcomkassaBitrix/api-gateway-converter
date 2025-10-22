import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface LogFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  methodFilter: string;
  setMethodFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  filteredCount: number;
  totalCount: number;
}

export default function LogFilters({
  search,
  setSearch,
  methodFilter,
  setMethodFilter,
  statusFilter,
  setStatusFilter,
  filteredCount,
  totalCount
}: LogFiltersProps) {
  const hasFilters = methodFilter !== 'all' || statusFilter !== 'all' || search;

  const handleReset = () => {
    setMethodFilter('all');
    setStatusFilter('all');
    setSearch('');
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Поиск по URL, IP, Request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Метод" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все методы</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="OPTIONS">OPTIONS</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="2xx">2xx (Успешно)</SelectItem>
            <SelectItem value="4xx">4xx (Ошибка клиента)</SelectItem>
            <SelectItem value="5xx">5xx (Ошибка сервера)</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={handleReset}
            className="gap-2"
          >
            <Icon name="X" size={16} />
            Сбросить
          </Button>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Найдено записей: <span className="font-semibold">{filteredCount}</span> из {totalCount}
      </div>
    </Card>
  );
}
