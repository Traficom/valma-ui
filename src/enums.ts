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