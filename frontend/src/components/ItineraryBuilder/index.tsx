
import { MapPin, Clock, IndianRupee } from 'lucide-react';
import type { DayPlan, Activity } from '../../types/travel';

interface ItineraryBuilderProps {
  itinerary: DayPlan[];
}

export function ItineraryBuilder({ itinerary }: ItineraryBuilderProps) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground border rounded-lg bg-card/50">
        <p>Your itinerary will appear here</p>
      </div>
    );
  }

  const renderActivity = (activity: Activity) => (
    <div key={activity.placeId} className="bg-background border rounded-md p-3 text-sm shadow-sm hover:shadow transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-foreground">{activity.name}</h4>
        <span className="flex items-center text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
          <IndianRupee size={12} className="mr-1" />
          {activity.costInr}
        </span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs line-clamp-2">{activity.description}</p>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Clock size={12} className="mr-1" />
          {activity.durationMinutes}m
        </div>
        <div className="flex items-center">
          <MapPin size={12} className="mr-1" />
          <span className="truncate max-w-[120px]">{activity.location}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-6">
      {itinerary.map((dayPlan) => (
        <div key={dayPlan.day} className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex justify-between items-end mb-4 border-b pb-2">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Day {dayPlan.day}</h3>
              <p className="text-sm text-muted-foreground">{new Date(dayPlan.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} • {dayPlan.theme}</p>
            </div>
            <div className="text-sm font-semibold">
              Est: ₹{dayPlan.estimatedCostInr}
            </div>
          </div>

          <div className="space-y-4">
            {dayPlan.morning?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Morning</h4>
                <div className="grid gap-3">{dayPlan.morning.map(renderActivity)}</div>
              </div>
            )}
            
            {dayPlan.afternoon?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Afternoon</h4>
                <div className="grid gap-3">{dayPlan.afternoon.map(renderActivity)}</div>
              </div>
            )}
            
            {dayPlan.evening?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Evening</h4>
                <div className="grid gap-3">{dayPlan.evening.map(renderActivity)}</div>
              </div>
            )}
          </div>
          
          {dayPlan.accommodation && (
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="font-semibold text-foreground">Stay: </span>
              <span className="text-muted-foreground">{dayPlan.accommodation}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
