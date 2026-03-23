"use client";

import { useState } from "react";
import { FileText, Send, Clock } from "lucide-react";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { TemplatesView } from "../templates/templates-view";
import { CampaignsView } from "./campaigns-view";
import { FollowUpsView } from "../follow-ups/follow-ups-view";

const TABS: UnifiedTab[] = [
  { label: "Templates", value: "templates", icon: FileText },
  { label: "Séquences", value: "sequences", icon: Send },
  { label: "Relances", value: "relances", icon: Clock },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaigns: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lists: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sequences: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prospects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relanceStats: any;
}

export function CampaignsPageView({
  templates,
  campaigns,
  lists,
  tasks,
  sequences,
  prospects,
  relanceStats,
}: Props) {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-5">
      <UnifiedTabs tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "templates" && <TemplatesView templates={templates} />}
        {activeTab === "sequences" && (
          <CampaignsView
            campaigns={campaigns}
            lists={lists}
            templates={templates}
          />
        )}
        {activeTab === "relances" && (
          <FollowUpsView
            tasks={tasks}
            sequences={sequences}
            prospects={prospects}
            relanceStats={relanceStats}
          />
        )}
      </div>
    </div>
  );
}
