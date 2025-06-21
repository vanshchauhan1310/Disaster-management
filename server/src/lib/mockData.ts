import type { User, SocialPost, OfficialUpdate } from "../../../types";
import { detectPriority } from "../services/helpers";

// --- Mock Users with Roles ---
export const users: User[] = [
  { id: "netrunnerX", name: "Netrunner X", role: "admin" },
  { id: "reliefAdmin", name: "Relief Admin", role: "admin" },
  { id: "contributor1", name: "Field Reporter", role: "contributor" },
  { id: "contributor2", name: "Emergency Responder", role: "contributor" }
];

// --- Helper: Mock Social Media for Specific Disaster ---
export function getMockSocialMediaForDisaster(disasterId: number): SocialPost[] {
  const disasterSocialPosts: SocialPost[] = [
    {
      id: 1,
      platform: "Twitter",
      username: "@mumbai_alert",
      content: "SOS! Heavy flooding in Mumbai's Bandra area. Water level rising rapidly. Need immediate rescue teams! #MumbaiFlood #Emergency",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      priority: detectPriority("SOS! Heavy flooding in Mumbai's Bandra area"),
      location: "Mumbai, India",
      verified: true,
      disaster_id: disasterId
    },
    {
      id: 2,
      platform: "Facebook",
      username: "Mumbai Emergency Response",
      content: "Rescue teams deployed to Bandra area. Evacuation centers set up at local schools. Please follow official instructions.",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      priority: false,
      location: "Mumbai, India",
      verified: true,
      disaster_id: disasterId
    },
    {
      id: 3,
      platform: "Instagram",
      username: "citizen_reporter",
      content: "Just witnessed the flooding in Bandra. Water level is chest-high in some areas. Stay safe everyone!",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      priority: false,
      location: "Mumbai, India",
      verified: false,
      disaster_id: disasterId
    }
  ];
  
  return disasterSocialPosts;
}

// --- Helper: Mock Official Updates ---
export function getMockOfficialUpdates(disasterId: number): OfficialUpdate[] {
  const officialUpdates: OfficialUpdate[] = [
    {
      id: 1,
      disaster_id: disasterId,
      title: "Emergency Response Activated",
      content: "National Disaster Response Force (NDRF) teams have been deployed to the affected areas. Evacuation orders issued for low-lying regions.",
      source: "NDRF Official",
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      priority: true
    },
    {
      id: 2,
      disaster_id: disasterId,
      title: "Weather Update",
      content: "Heavy rainfall expected to continue for next 24 hours. Residents advised to stay indoors and avoid unnecessary travel.",
      source: "India Meteorological Department",
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      priority: false
    },
    {
      id: 3,
      disaster_id: disasterId,
      title: "Transportation Update",
      content: "Local trains suspended on Western line. Bus services diverted. Airport operations normal but delays expected.",
      source: "Mumbai Municipal Corporation",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      priority: false
    }
  ];
  
  return officialUpdates;
} 