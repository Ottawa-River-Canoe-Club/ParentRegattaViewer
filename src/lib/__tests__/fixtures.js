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

// Multi-day regatta: a plain text row ("Day 1" / "Day 2") divides each day's
// block of races instead of a real header. Both tabs carry their own
// dividers, at the same points in each tab's row order, matching how a real
// two-day sheet's schedule and draw/results tabs are laid out in parallel.
export const MULTI_DAY_SCHEDULE = `,,,,,
,Ontario Championships 2026,,,,
,Time,Race #,Event,Heat #,Distance
,Day 1,,,,
,8:00:00,1,U14 Boys K1,Heat 1,500m
,8:05:00,2,U14 Boys K2,Heat 1,500m
,Day 2,,,,
,9:00:00,3,U12 Mixed C4,Heat 1,500m
,9:05:00,4,U14 Girls C-15,FINAL,500m
`

export const MULTI_DAY_RESULTS = `Day 1,,,,,,
,,,,,,
Event,1,U14 BOYS K1,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,John Smith,ORCC,2:15.3,1,10
,,,,,,
Event,2,U14 BOYS K2,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,Emery Gautihier,ORCC,,,
,,,,,,
Day 2,,,,,,
,,,,,,
Event,3,U12 MIXED C4,HEAT 1,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,Ben Cooper,ORCC,,,
,,,,,,
Event,4,U14 GIRLS C-15,FINAL,500m,,
,,,,,,
,LANE,NAME(S),CLUB,TIME,FINISH,POINTS
,1,Kenzie Cooper,NBCC,,,
`

// CKO format: schedule tab shares EOD's exact headers (Race #/Event/Time),
// but folds heat and distance into the event string itself ("U16 Women's
// C2 500m Final A") rather than giving either its own column. A trailing,
// unlabeled numeric column (real sheet has values like 0.04, 0.2) is never
// mapped to anything and is just along for the ride. "Break"/"Lunch" rows
// use the same shape the EOD parser already handles.
export const CKO_SCHEDULE_ONLY = `,,,,
,Draft 2026 Ontario Cup - Ontario Championships (Day 1) Schedule,,,
,Draft Schedule  - Times & events may change,,,
Race #,Event,Time,
1,U16 Women's C2 500m Final A,8:00:00 AM,0.2
2,U16 Men's IC4 500m Final A,8:05:00 AM,0.04
3,U16 Women's K4 500m Final A,8:10:00 AM,0.04
,Break,,
4,U16 Men's K2 500m Final B,8:15:00 AM,0.04
`

// CKO format: draw tab. Unlike every other format, the race *number* is
// alone on its own row, one below the "Race,<event>,<time>" header — this
// fixture keeps that real shape rather than simplifying it away. A per-club
// overall-standings side table (columns 8+) sits alongside the title rows;
// this parser only reads columns 0-4, so it's included here to prove that's
// actually true rather than assumed. The last block is one of the sheet's
// real trailing "ghost" blocks — pre-formatted but never filled in — which
// must produce no race at all rather than an empty one.
export const CKO_RESULTS_ONLY = `,CKO Sprint's Ontario Championships,,,,,,,OVERALL RESULTS,,
,DAY 1 - SATURDAY AUGUST 15,,,,,,,Balmy Beach,Burloak,Carleton Place
,Draft Draw  - Times & events may change,,,,,,,0,0,0
Race,U16 Women's C2 500m Final A,8:00 AM,,,,,,,,,
1,,,,,,,,,,,,
Lane,Crew,Club,Finish,Time,,,,,,,,
0,"Greta Dybinski , Eleanor Blake",Rideau,,,,,,,,,,
1,Jordan Mavraganis and Kennedy Mavraganis,ORCC,,,,,,,,,,
2,,,,,,,,,,,,
,,,,,,,,,,,,
Race,U16 Men's IC4 500m Final A,8:05 AM,,,,,,,,,
2,,,,,,,,,,,,
Lane,Crew,Club,Finish,Time,,,,,,,,
0,K. Bellerby / M. Kravchuk,MCC,,,,,,,,,,
1,"Anna Andrus/Chloe Andrus/Zara Dew, Aurora McWilliam",CDBCC,,,,,,,,,,
,,,,,,,,,,,,
Race,,,,,,,,,,,,
,,,,,,,,,,,,
Lane,Crew,Club,Finish,Time,,,,,,,,
0,,,,,,,,,,,,
1,,,,,,,,,,,,
`
