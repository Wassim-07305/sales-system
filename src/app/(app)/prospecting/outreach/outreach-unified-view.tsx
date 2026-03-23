"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Send, Clock } from "lucide-react";
import { TemplatesView } from "../templates/templates-view";
import { CampaignsView } from "../campaigns/campaigns-view";
import { FollowUpsView } from "../follow-ups/follow-ups-view";

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

export function OutreachUnifiedView({
  templates,
  campaigns,
  lists,
  tasks,
  sequences,
  prospects,
  relanceStats,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Templates — always visible */}
      <TemplatesView templates={templates} />

      {/* Additional sections */}
      <Accordion type="multiple" defaultValue={["campaigns"]} className="space-y-2">
        <AccordionItem value="campaigns" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span>Campagnes</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CampaignsView
              campaigns={campaigns}
              lists={lists}
              templates={templates}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="follow-ups" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Relances</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FollowUpsView
              tasks={tasks}
              sequences={sequences}
              prospects={prospects}
              relanceStats={relanceStats}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
