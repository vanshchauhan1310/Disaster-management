import { supabase } from '../lib/supabase';
import { getMockSocialMediaForDisaster, getMockOfficialUpdates } from '../lib/mockData';
import { parseBody, logAction } from '../services/helpers';
import { geocodeLocation, getNearbyResources } from '../services/geo';
import { sockets } from './websocket';
import type { User } from '../../../types';

export async function handleDisasterGet(req: Request) {
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  let query = supabase.from("disasters").select("*");
  if (tag) query = query.contains("tags", [tag]);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function handleDisasterPost(req: Request, user: User) {
  const body = await parseBody(req);
  const { title, location_name, description, tags } = body;
  if (!title || !description) return Response.json({ error: "Missing fields" }, { status: 400 });

  let location = null;
  if (location_name) location = await geocodeLocation(location_name);

  const { data, error } = await supabase
    .from("disasters")
    .insert([{
      title,
      location_name,
      location: location ? `SRID=4326;POINT(${location[0]} ${location[1]})` : null,
      description,
      tags,
      owner_id: user.id,
      audit_trail: [{ action: "created", by: user.id, at: new Date().toISOString() }]
    }])
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:new", data: data[0] }));
  logAction("create_disaster", { user: user.id, title });
  return Response.json(data[0]);
}

export async function handleDisasterPut(req: Request, id: number, user: User) {
    logAction("update_attempt", { user: user.id, role: user.role, id });

    const { data: disaster, error: queryError } = await supabase.from("disasters").select("owner_id").eq("id", id).single();
    if (queryError || !disaster) {
      console.error("Error finding disaster for update:", queryError);
      return Response.json({ error: "Disaster not found" }, { status: 404 });
    }

    if (user.role !== 'admin' && disaster.owner_id !== user.id) {
      logAction("update_forbidden", { user: user.id, role: user.role, disaster_owner: disaster.owner_id, id });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await parseBody(req);
    const { title, location_name, description, tags } = body;
    let location = null;
    if (location_name) location = await geocodeLocation(location_name);

    const { data, error } = await supabase
      .from("disasters")
      .update({
        title, location_name,
        location: location ? `SRID=4326;POINT(${location[0]} ${location[1]})` : null,
        description, tags
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:update", data: data[0] }));
    logAction("update_disaster", { user: user.id, id });
    return Response.json(data[0]);
}

export async function handleDisasterDelete(req: Request, id: number, user: User) {
    logAction("delete_attempt", { user: user.id, role: user.role, id });

    const { data: disaster, error: queryError } = await supabase.from("disasters").select("owner_id").eq("id", id).single();
    
    if (queryError || !disaster) {
      console.error("Error finding disaster for deletion:", queryError);
      return Response.json({ error: "Disaster not found" }, { status: 404 });
    }

    if (user.role !== 'admin' && disaster.owner_id !== user.id) {
      logAction("delete_forbidden", { user: user.id, role: user.role, disaster_owner: disaster.owner_id, id });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from("disasters").delete().eq("id", id);
    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return Response.json({ error: deleteError.message }, { status: 500 });
    }
    
    for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:delete", data: id }));
    
    logAction("delete_disaster", { user: user.id, id });
    return Response.json({ success: true });
}

export async function handleDisasterResources(req: Request, disasterId: number) {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "0");
    const lon = parseFloat(url.search_params.get("lon") || "0");
    const radius = parseFloat(url.search_params.get("radius") || "10000");
    
    if (lat === 0 && lon === 0) {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("disaster_id", disasterId);
      
      if (error) return Response.json({ error: error.message }, { status: 500 });
      
      logAction("resources_fetched", { disaster_id: disasterId, count: data?.length || 0 });
      return Response.json(data || []);
    }
    
    const nearbyResources = await getNearbyResources(lat, lon, radius);
    
    const disasterResources = nearbyResources.filter(resource => 
      resource.disaster_id === disasterId || !resource.disaster_id
    );
    
    for (const ws of sockets) {
      ws.send(JSON.stringify({ 
        type: "resources_updated", 
        disaster_id: disasterId, 
        data: disasterResources 
      }));
    }
    
    logAction("resources_mapped", { 
      disaster_id: disasterId, 
      lat, 
      lon, 
      radius, 
      count: disasterResources.length 
    });
    
    return Response.json(disasterResources);
}

export async function handleDisasterSocialMedia(req: Request, disasterId: number) {
    const socialPosts = getMockSocialMediaForDisaster(disasterId);
    
    for (const ws of sockets) {
      ws.send(JSON.stringify({ 
        type: "social_media_updated", 
        disaster_id: disasterId, 
        data: socialPosts 
      }));
    }
    
    logAction("social_media_fetched", { disaster_id: disasterId, count: socialPosts.length });
    return Response.json(socialPosts);
}

export async function handleDisasterOfficialUpdates(req: Request, disasterId: number) {
    const officialUpdates = getMockOfficialUpdates(disasterId);
    
    logAction("official_updates_fetched", { disaster_id: disasterId, count: officialUpdates.length });
    return Response.json(officialUpdates);
} 