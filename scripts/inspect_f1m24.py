import sqlite3, json

path = r"E:\Downloads\BTG Site\F1MBTG-v1.0.db"
c = sqlite3.connect(path)
c.row_factory = sqlite3.Row

def dump(label, sql):
    print("\n=== " + label + " ===")
    try:
        for r in c.execute(sql):
            print(json.dumps({k: r[k] for k in r.keys()}, ensure_ascii=False, default=str))
    except Exception as e:
        print("ERR", e)

dump("Championships", "select Id, Name, UniqueName, GridSize, SeatsPerTeam, SeatsReserve from Championships")
dump("Seasons", "select Id, ChampionshipId, Name, FullName, GridSize from Seasons")
dump("Events (sample 12)", "select Id, SeasonId, TrackId, Date, Name, ShortName, EventType, CompletedStatus from Events order by Date limit 12")
dump("Tracks (sample 10)", "select Id, UniqueName, CircuitName, LocationName from Tracks limit 10")
dump("SessionResults (race sessions only, 8)", "select Id, EventId, TrackId, SessionType, SessionPosition, RaceType, QualificationType, Date, TotalLaps, FastestLapDriverName, FastestLapTimeInt, SessionStatus from SessionResults where SessionType=1 or RaceType in (1,2,3) limit 8")
dump("SessionResults distinct sessiontype", "select SessionType, RaceType, QualificationType, count(*) cnt from SessionResults group by SessionType, RaceType, QualificationType")
dump("F2 Bahrain Feature (SR 442) full", "select ds.DriverName, ds.TeamName, ds.GridPosition, ds.Position, ds.LapsCount, ds.FastestLapTimeInt, ds.TimeInt, ds.Status, ds.DriverPointsRaw, ds.RaceNumber from DriverSessions ds where ds.SessionResultId=442 order by ds.Position")

dump("F2 Bahrain Sprint (SR 441) full", "select ds.DriverName, ds.TeamName, ds.GridPosition, ds.Position, ds.LapsCount, ds.FastestLapTimeInt, ds.TimeInt, ds.Status, ds.DriverPointsRaw, ds.RaceNumber from DriverSessions ds where ds.SessionResultId=441 order by ds.Position")
dump("Drivers (8)", "select Id, FirstName, LastName, Name, InGameName, RaceNumber from Drivers limit 8")
dump("Teams (8)", "select Id, Name, Abbreviation, UniqueName from Teams limit 8")
