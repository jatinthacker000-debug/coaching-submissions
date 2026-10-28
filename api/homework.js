import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { student_id, homework_date, group_name, class_name, type, start_date, end_date } = req.query;

    // 1. Fetch Student Status (for Student Dashboard)
    if (student_id) {
      const { data, error } = await supabase
        .from("homework_status")
        .select("*")
        .eq("student_id", student_id)
        .order("homework_date", { ascending: false });

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { statuses: data });
    }

    // 2. Fetch All Events (for Coach Dashboard)
    if (type === "events") {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, event_date, group_name, title, color, created_at")
        .order("event_date", { ascending: false });

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { events: data || [] });
    }

    // 3. Fetch Status Grid (for Coach Dashboard) - Single Date or Date Range
    const effectiveStart = start_date || homework_date;
    const effectiveEnd = end_date || homework_date || start_date;

    if (effectiveStart && effectiveEnd) {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

      function resolveDefaultClass(className, groupName) {
        if (className && String(className).trim()) return String(className).trim();
        const g = (groupName || "").trim().toLowerCase();
        if (["lakshya", "prayas", "sankalp"].includes(g)) return "Velocity";
        if (g === "nalanda") return "IGNITE coaching class";
        if (["neps", "negs"].includes(g)) return "Epsilon Classes";
        if (g.startsWith("nerd tutors")) return groupName.trim();
        return "";
      }

      let studentQuery = supabase
        .from("students")
        .select("id, name, group_name, class_name")
        .order("name", { ascending: true });

      if (class_name && class_name !== "ALL" && class_name !== "__ALL__") {
        const cLower = class_name.toLowerCase().trim();
        if (cLower.includes("epsilon")) {
          studentQuery = studentQuery.or("class_name.ilike.%epsilon%,group_name.in.(NEPS,NEGS,Epsilon,EPSILON)");
        } else if (cLower.includes("velocity")) {
          studentQuery = studentQuery.or("class_name.ilike.%velocity%,group_name.in.(Lakshya,Prayas,Sankalp,Velocity)");
        } else if (cLower.includes("ignite")) {
          studentQuery = studentQuery.or("class_name.ilike.%ignite%,group_name.in.(Nalanda,Ignite)");
        } else {
          studentQuery = studentQuery.ilike("class_name", `%${class_name}%`);
        }
      }

      if (group_name && group_name !== "ALL" && group_name !== "__ALL__") {
        const gLower = group_name.toLowerCase().trim();
        if (gLower === "epsilon" || gLower === "epsilon classes") {
          studentQuery = studentQuery.or("class_name.ilike.%epsilon%,group_name.in.(NEPS,NEGS,Epsilon,EPSILON)");
        } else if (gLower === "velocity") {
          studentQuery = studentQuery.or("class_name.ilike.%velocity%,group_name.in.(Lakshya,Prayas,Sankalp,Velocity)");
        } else if (gLower === "ignite") {
          studentQuery = studentQuery.or("class_name.ilike.%ignite%,group_name.in.(Nalanda,Ignite)");
        } else {
          studentQuery = studentQuery.eq("group_name", group_name);
        }
      }

      const { data: rawStudents, error: studErr } = await studentQuery;
      if (studErr) return sendError(res, studErr.message, 500);

      const students = (rawStudents || []).map(st => ({
        ...st,
        class_name: st.class_name || resolveDefaultClass(st.class_name, st.group_name)
      }));

      if (!students || students.length === 0) {
        return sendJson(res, { students: [], statuses: [] });
      }

      const studentIds = students.map(s => s.id);
      const { data: statuses, error: statErr } = await supabase
        .from("homework_status")
        .select("*")
        .gte("homework_date", effectiveStart)
        .lte("homework_date", effectiveEnd)
        .in("student_id", studentIds);

      if (statErr) return sendError(res, statErr.message, 500);
      return sendJson(res, { students, statuses: statuses || [] });
    }

    // 4. Fetch Homework Links and Calendar Events
    let query = supabase.from("homework_links").select("id, homework_date, group_name, link");
    if (group_name) {
      query = query.eq("group_name", group_name);
    }
    const { data: links, error } = await query;
    if (error) return sendError(res, error.message, 500);

    let events = [];
    try {
      let evQuery = supabase.from("calendar_events").select("id, event_date, group_name, title, color");
      if (group_name) {
        evQuery = evQuery.eq("group_name", group_name);
      }
      const { data: evData, error: evErr } = await evQuery;
      if (!evErr && evData) {
        events = evData;
      }
    } catch (_) {}

    if (res.setHeader) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    }
    return sendJson(res, { links: links || [], events: events || [] });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    
    // 1. Upsert Homework Status
    const { updates, homework_date, group_name, group_names, link, event_date, title, color } = req.body || {};
    
    if (updates && Array.isArray(updates)) {
      if (updates.length === 0) return sendJson(res, { success: true });
      const { error } = await supabase
        .from("homework_status")
        .upsert(updates, { onConflict: "homework_date, student_id" });
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    // 2. Upsert Calendar Event(s)
    if (event_date && title && (group_name || (Array.isArray(group_names) && group_names.length > 0))) {
      let targetGroups = [];
      if (group_name === "ALL_GRADE_10") {
        targetGroups = ["Ignite", "Velocity", "Epsilon"];
      } else if (Array.isArray(group_names) && group_names.length > 0) {
        targetGroups = group_names;
      } else if (Array.isArray(group_name)) {
        targetGroups = group_name;
      } else {
        targetGroups = [group_name];
      }

      const rows = targetGroups.map(g => ({
        event_date,
        group_name: g,
        title: title.trim(),
        color: (color || "blue").trim().toLowerCase()
      }));

      const { data, error } = await supabase
        .from("calendar_events")
        .upsert(rows, { onConflict: 'event_date,group_name,title' })
        .select();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { events: data, event: data && data[0] }, 201);
    }

    // 3. Upsert Homework Link(s)
    if (homework_date && (group_name || (Array.isArray(group_names) && group_names.length > 0)) && link) {
      let targetGroups = [];
      if (group_name === "ALL_GRADE_10") {
        targetGroups = ["Ignite", "Velocity", "Epsilon"];
      } else if (Array.isArray(group_names) && group_names.length > 0) {
        targetGroups = group_names;
      } else if (Array.isArray(group_name)) {
        targetGroups = group_name;
      } else {
        targetGroups = [group_name];
      }

      const rows = targetGroups.map(g => ({
        homework_date,
        group_name: g,
        link: link.trim()
      }));

      const { data, error } = await supabase
        .from("homework_links")
        .upsert(rows, { onConflict: 'homework_date,group_name' })
        .select();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { links: data, link: data && data[0] }, 201);
    }

    return sendError(res, "Invalid body parameters.", 400);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id, event_id } = req.query;
    if (event_id) {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", event_id);

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    if (!id) return sendError(res, "Missing ID.", 400);

    const { error } = await supabase
      .from("homework_links")
      .delete()
      .eq("id", id);

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}
