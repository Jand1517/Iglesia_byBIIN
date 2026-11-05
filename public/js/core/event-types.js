export const EVENT_TYPES = [
  ["religioso", "Religioso"],
  ["administrativo", "Administrativo"],
];

export const eventTypeLabel = (type) =>
  EVENT_TYPES.find(([value]) => value === type)?.[1] || "Sin clasificar";
