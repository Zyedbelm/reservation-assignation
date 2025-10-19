
interface WeekHeaderProps {
  weekDays: Date[];
  today: Date;
}

const WeekHeader = ({ weekDays, today }: WeekHeaderProps) => {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="grid grid-cols-8 border-b">
      <div className="p-2 text-sm font-medium text-gray-500 border-r">
        Heure
      </div>
      {weekDays.map((day, index) => {
        const isToday = day.toDateString() === today.toDateString();
        return (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-r ${
              isToday ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
            }`}
          >
            <div className="text-sm font-medium">{dayNames[index]}</div>
            <div className={`text-lg ${isToday ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
              {day.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeekHeader;
