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

// Rideau format: no single "Event" column — Age/Gender/Boat combine into the
// event name, and the race number has no header label (it's always column 0).
export const RIDEAU_SCHEDULE_ONLY = `,Age,Gender,Boat,Distance,Final,Time
1,U16,Men,C4,1000m,Final 1,8:00 AM
2,U16,Women,K4,1000m,Final 1,8:07 AM
3,Open,Men,K4,200m,Final 1,11:06 AM
,,20' Course Break,,,
4,U16,Mixed,C-15,500m,Final 1,12:00 PM
`

// Draw/results tab: race number + literal "Lane" mark the start of each
// block; that same row carries the event name (with distance folded in),
// heat/final, and scheduled time. Adapted from the real Rideau Regatta 2026
// export, keeping its real messiness: blank filler lanes, a crew quoted with
// commas instead of slashes, a DNF logged in the status column, an SCR
// logged in the same column, a blank club, and a stray "course break"
// annotation row sitting inside a block.
export const RIDEAU_RESULTS_ONLY = `1,Lane,U16 Men C4 1000m,Final 1,8:00 AM,Time:,,,
1,6,Will Bertazzo / Weylan Stewart / Kiernan McCulloch / Devlin Payne,CPCC,,00:05'10.29,,,
DNF,4,MacPherson Lowry / Dean Pierce / Tristan Wallace / Till Slanina,CPCC,DNF,,,,
,9,,,,,,,
2,Lane,U16 Women K4 1000m,Final 1,8:07 AM,Time:,,,
1,5,Juniper Code / Alexa Richardson / Abby Way / Nykka Ho,RCC,,00:04'24.58,,,
,7,Paul Mullen,PICC,SCR,,,,
,,20' Course Break,,,,,,
3,Lane,Open Men K4 200m,Final 1,11:06 AM,Time:,,,
1,5,Riley Taylor/Alessandro Pucci/ Alex Hof / David Stewart,RCC,,00:00'34.61,,,
6,3,"Paul Mullen, Vasyl Zelnichenko, Sarah Kennedy, Amelia Gauthier",PICC,,00:00'45.04,,,
,4,Alex Smith / Adam Schlosser,,,00:02'08.42,,,
`
