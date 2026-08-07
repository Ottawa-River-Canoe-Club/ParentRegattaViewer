// Schedule tab: Time/Race#/Event/Heat#/Distance, with a leading blank column.
export const SCHEDULE_ONLY = `,,,,,
,EOD U12 & U14 Championships 2026,,,,
,Time,Race #,Event,Heat #,Distance
,8:00:00,1,U14 Boys K1,Heat 1,500m
,8:05:00,2,U14 Boys K2,Heat 1,500m
,8:10:00,3,U12 Mixed C4,Heat 1,500m
,LUNCH BREAK,,,,
,12:40:00,4,U14 Girls C-15,FINAL,500m
`

// Draw/Results tab: a separate CSV export (different gid), not a section split
// out of the schedule tab. Mirrors the real tab's own quirk — the Event row
// has no leading blank column, but the LANE header and lane rows do.
export const RESULTS_ONLY = `Event,1,U14 BOYS K1,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,John Smith,ORCC,2:15.3,1,10
,2,John Smith,CPCC,2:18.9,2,8
,3,Zach Miller,ORCC,2:20.0,3,6
,,,,,,
Event,2,U14 BOYS K2,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,"Emery Gautihier, Henry Trussler",ORCC,,,
,2,"Ben Cooper, Sam Lee",ORCC,,,
,,,,,,
Event,3,U12 MIXED C4,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,"Ben Cooper, Maverick Lacelle, Alex Chan, Sam Lee",ORCC/CPCC,,,
,,,,,,
Event,4,U14 GIRLS C-15,FINAL,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,Kenzie Cooper,NBCC,,,
`
