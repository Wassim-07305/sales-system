"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Clock, Medal } from "lucide-react";

const mockChallenges = [
  {
    title: "Booker 5 appels cette semaine",
    description: "Bookez au moins 5 appels découverte cette semaine.",
    current: 3,
    target: 5,
    points: 200,
    deadline: "Dim 23 Fév",
    active: true,
  },
  {
    title: "100% show-up 3 jours de suite",
    description: "Ayez un taux de show-up de 100% pendant 3 jours consécutifs.",
    current: 2,
    target: 3,
    points: 300,
    deadline: "Ven 21 Fév",
    active: true,
  },
  {
    title: "Closer 2 deals cette semaine",
    description: "Signez 2 contrats minimum cette semaine.",
    current: 0,
    target: 2,
    points: 500,
    deadline: "Dim 23 Fév",
    active: true,
  },
];

const leaderboard = [
  { name: "Alex M.", points: 1250, rank: 1 },
  { name: "Pierre D.", points: 980, rank: 2 },
  { name: "Marie L.", points: 870, rank: 3 },
  { name: "Jean T.", points: 650, rank: 4 },
  { name: "Sophie R.", points: 520, rank: 5 },
];

export default function ChallengesPage() {
  return (
    <div>
      <PageHeader
        title="Défis"
        description="Relevez des challenges et grimpez dans le classement"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenges */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            Défis en cours
          </h2>
          {mockChallenges.map((challenge, i) => {
            const progress = Math.round((challenge.current / challenge.target) * 100);
            return (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-1">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {challenge.description}
                      </p>
                    </div>
                    <Badge className="bg-brand/10 text-brand-dark shrink-0 ml-4">
                      <Trophy className="h-3 w-3 mr-1" />
                      {challenge.points} pts
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">
                      {challenge.current}/{challenge.target}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {challenge.deadline}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Leaderboard */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="h-5 w-5 text-brand" />
              Classement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.rank <= 3 ? "bg-brand/5" : ""
                  }`}
                >
                  <span
                    className={`text-lg font-bold w-6 ${
                      player.rank === 1
                        ? "text-yellow-500"
                        : player.rank === 2
                        ? "text-gray-400"
                        : player.rank === 3
                        ? "text-orange-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {player.rank}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{player.name}</p>
                  </div>
                  <span className="text-sm font-semibold">{player.points} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
