import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface StatData {
  label: string;
  value: string;
  icon: string;
  trend: string;
}

interface StatsCardsProps {
  statsData: StatData[];
}

const StatsCards = ({ statsData }: StatsCardsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      {statsData.map((stat, idx) => (
        <Card key={idx} className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">{stat.label}</CardDescription>
            <Icon name={stat.icon as any} className="text-muted-foreground" size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-primary mt-1">{stat.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
