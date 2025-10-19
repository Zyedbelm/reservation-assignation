
import { GameMaster } from '@/hooks/useGameMasters';
import { GMCompetency } from '@/hooks/useGMCompetencies';
import { EventGameMapping } from '@/hooks/useEventGameMappings';
import { Availability } from '@/hooks/useAvailabilities';
import { Activity } from '@/hooks/useActivities';

export const debugGMAssignment = (
  events: Activity[],
  gameMasters: GameMaster[],  
  mappings: EventGameMapping[],
  competencies: GMCompetency[],
  availabilities: Availability[]
) => {
  console.log('\n=== 🔍 DEBUG COMPLET GM ASSIGNMENT ===');
  console.log('📊 STATISTIQUES:');
  console.log(`  - Events totaux: ${events.length}`);
  console.log(`  - Game Masters: ${gameMasters.length}`);
  console.log(`  - Disponibilités: ${availabilities.length}`);
  console.log(`  - Compétences: ${competencies.length}`);
  console.log(`  - Mappings: ${mappings.length}`);

  const unassignedEvents = events.filter(event => !event.assigned_gm_id);
  console.log(`  - Events non assignés: ${unassignedEvents.length}`);

  console.log('\n📋 DÉTAIL DES GMs:');
  gameMasters.forEach(gm => {
    const gmAvailabilities = availabilities.filter(av => av.gm_id === gm.id);
    const gmCompetencies = competencies.filter(comp => comp.gm_id === gm.id);
    
    console.log(`👤 GM: ${gm.name}`);
    console.log(`   - Actif: ${gm.is_active}`);
    console.log(`   - Disponible: ${gm.is_available}`);
    console.log(`   - Disponibilités: ${gmAvailabilities.length} jours`);
    console.log(`   - Compétences: ${gmCompetencies.length} jeux`);
    
    gmAvailabilities.forEach(av => {
      console.log(`     📅 ${av.date}: [${av.time_slots.join(', ')}]`);
    });
  });

  console.log('\n🎯 ANALYSE PAR EVENT NON ASSIGNÉ:');
  unassignedEvents.forEach(event => {
    console.log(`\n--- 📅 Event: ${event.title} ---`);
    console.log(`Date: ${event.date}, Horaire: ${event.start_time}-${event.end_time}`);
    
    const requiredTimeSlot = `${event.start_time}-${event.end_time}`;
    console.log(`Créneau requis: ${requiredTimeSlot}`);
    
    // Vérifier les disponibilités pour cette date
    const dateAvailabilities = availabilities.filter(av => av.date === event.date);
    console.log(`📍 Disponibilités pour ${event.date}: ${dateAvailabilities.length}`);
    
    dateAvailabilities.forEach(av => {
      const gm = gameMasters.find(g => g.id === av.gm_id);
      console.log(`  👤 ${gm?.name}: [${av.time_slots.join(', ')}]`);
      
      // Vérifier correspondance exacte
      const exactMatch = av.time_slots.includes(requiredTimeSlot);
      console.log(`    ✅ Match exact ${requiredTimeSlot}: ${exactMatch}`);
      
      // Vérifier toute-la-journee
      const fullDay = av.time_slots.includes('toute-la-journee');
      console.log(`    🌅 Toute la journée: ${fullDay}`);
      
      // Vérifier correspondance flexible
      const eventStartHour = event.start_time.split(':')[0];
      const flexibleMatch = av.time_slots.some(slot => {
        if (!slot.includes('-')) return false;
        const slotStartHour = slot.split('-')[0].split(':')[0];
        return slotStartHour === eventStartHour;
      });
      console.log(`    🔄 Match flexible (heure ${eventStartHour}): ${flexibleMatch}`);
    });

    // Analyser les GMs éligibles
    const eligibleGMs = gameMasters.filter(gm => {
      if (!gm.is_active || !gm.is_available) {
        console.log(`  ❌ ${gm.name}: Inactif ou indisponible (is_active: ${gm.is_active}, is_available: ${gm.is_available})`);
        return false;
      }
      
      const gmAvailability = availabilities.find(
        av => av.gm_id === gm.id && av.date === event.date
      );
      
      if (!gmAvailability) {
        console.log(`  ❌ ${gm.name}: Pas de disponibilité pour ${event.date}`);
        return false;
      }
      
      const hasExactSlot = gmAvailability.time_slots.includes(requiredTimeSlot);
      const hasFullDay = gmAvailability.time_slots.includes('toute-la-journee');
      
      if (hasExactSlot || hasFullDay) {
        console.log(`  ✅ ${gm.name}: ÉLIGIBLE (exact: ${hasExactSlot}, fullday: ${hasFullDay})`);
        return true;
      }
      
      console.log(`  ❌ ${gm.name}: Créneaux incompatibles`);
      return false;
    });
    
    console.log(`🎯 GMs éligibles pour "${event.title}": ${eligibleGMs.length}`);
    eligibleGMs.forEach(gm => console.log(`  ✅ ${gm.name}`));
    
    if (eligibleGMs.length === 0) {
      console.log('⚠️ AUCUN GM ÉLIGIBLE - Raisons possibles:');
      console.log('   - Pas de GM actif/disponible');
      console.log('   - Créneaux horaires incompatibles');
      console.log('   - Pas de disponibilités définies pour cette date');
    }
  });

  console.log('\n=== FIN DEBUG GM ASSIGNMENT ===\n');

  return {
    totalEvents: events.length,
    unassignedEvents: unassignedEvents.length,
    totalGMs: gameMasters.length,
    activeGMs: gameMasters.filter(gm => gm.is_active && gm.is_available).length,
    availabilityRecords: availabilities.length
  };
};
