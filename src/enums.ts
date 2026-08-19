export const SCENARIO_STATUS_STATE = {
  STARTING: 'starting',
  PREPARING: 'preparing',
  RUNNING: 'running',
  FINISHED: 'finished',
} as const;

export type ScenarioStatusState =
  typeof SCENARIO_STATUS_STATE[keyof typeof SCENARIO_STATUS_STATE];

export const SCENARIO_TYPES = {
  GOODS_TRANSPORT: 'goods_transport',
  LONG_DISTANCE: 'long_distance',
  PASSENGER_TRANSPORT: 'passenger_transport',
} as const;

export type ScenarioType =
  typeof SCENARIO_TYPES[keyof typeof SCENARIO_TYPES];

 
export const SORT_TYPES = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  TYPE_ASC: 'type_asc',
  TYPE_DESC: 'type_desc',
} as const;

export type SortType =
  typeof SORT_TYPES[keyof typeof SORT_TYPES];
