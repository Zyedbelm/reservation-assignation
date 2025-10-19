
interface EventMetadataProps {
  event: any;
}

const EventMetadata = ({ event }: EventMetadataProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
        <div>
          <span className="font-medium">Créé le:</span><br />
          {new Date(event.created_at).toLocaleString('fr-FR')}
        </div>
        <div>
          <span className="font-medium">Modifié le:</span><br />
          {new Date(event.updated_at).toLocaleString('fr-FR')}
        </div>
      </div>

      {event.make_event_id && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">ID Make:</span> {event.make_event_id}
        </div>
      )}
    </>
  );
};

export default EventMetadata;
