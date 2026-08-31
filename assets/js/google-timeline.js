(function () {
  "use strict";

  if (!document.body.matches('[data-page="google-timeline"]')) return;

  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const copy = lang === "en" ? {
    invalidJson: "The selected file is not valid JSON.", tooLarge: "Files larger than 100 MB are not accepted in this browser tool.",
    unsupported: "This does not look like a Google Timeline export. Expected semanticSegments, timelineObjects, locations, or a Timeline array.",
    valid: "Google Timeline structure verified. The records are ready for local analysis.", warning: "Google Timeline structure verified with warnings. Review the details before using the results.",
    noRecords: "The Timeline structure is valid, but it contains no usable visits or routes.", file: "File", format: "Format", records: "records", points: "points", place: "places", movement: "movement",
    noData: "No records match the current filters.", all: "All", visit: "Visits", activity: "Movement", path: "Paths", avgSpeed: "Average speed", distance: "Distance", duration: "Moving time", stay: "Stay time", topPlace: "Top place", noMode: "Unclassified", mapEmpty: "Load verified data to show the map.",
    noMap: "The map library could not be loaded. Statistics are still available.", playback: "Playing", stopped: "Ready", notAvailable: "—", day: "days", hours: "hours", visits: "visits", km: "km", min: "min", entries: "records", recordVisit: "Visit", recordActivity: "Movement", recordPath: "Path", shown: "shown"
  } : {
    invalidJson: "선택한 파일은 올바른 JSON이 아닙니다.", tooLarge: "브라우저 도구에서는 100MB보다 큰 파일을 받지 않습니다.",
    unsupported: "Google Timeline 내보내기로 보이지 않습니다. semanticSegments, timelineObjects, locations 또는 Timeline 배열이 필요합니다.",
    valid: "Google Timeline 구조를 확인했습니다. 브라우저에서 분석할 수 있습니다.", warning: "Google Timeline 구조를 확인했지만 경고가 있습니다. 세부 내용을 확인해 주세요.",
    noRecords: "Timeline 구조는 맞지만 사용할 수 있는 방문·경로 기록이 없습니다.", file: "파일", format: "형식", records: "개 기록", points: "개 좌표", place: "곳", movement: "이동",
    noData: "현재 필터와 일치하는 기록이 없습니다.", all: "전체", visit: "방문지", activity: "이동", path: "경로", avgSpeed: "평균 속도", distance: "이동 거리", duration: "이동 시간", stay: "체류 시간", topPlace: "최다 방문지", noMode: "분류 없음", mapEmpty: "검증된 데이터를 불러오면 지도가 표시됩니다.",
    noMap: "지도 라이브러리를 불러오지 못했습니다. 통계는 계속 확인할 수 있습니다.", playback: "재생 중", stopped: "준비됨", notAvailable: "—", day: "일", hours: "시간", visits: "회", km: "km", min: "분", entries: "개 기록", recordVisit: "방문", recordActivity: "이동", recordPath: "경로", shown: "표시"
  };
  const weekdayNames = lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["일", "월", "화", "수", "목", "금", "토"];
  const $ = (selector) => document.querySelector(selector);
  const els = {
    input: $("#timelineFile"), dropzone: $("#timelineDropzone"), choose: $("#timelineChooseButton"), reset: $("#timelineResetButton"), meta: $("#timelineFileMeta"), validation: $("#timelineValidation"), validationDetails: $("#timelineValidationDetails"), dashboard: $("#timelineDashboard"), dataStatus: $("#timelineDataStatus"), from: $("#timelineFrom"), to: $("#timelineTo"), type: $("#timelineType"), mode: $("#timelineMode"), minDuration: $("#timelineMinDuration"), filterReset: $("#timelineFilterReset"), stats: $("#timelineStats"), transport: $("#timelineTransportStats"), weekdays: $("#timelineWeekdayStats"), places: $("#timelinePlaceStats"), records: $("#timelineRecordList"), recordCount: $("#timelineRecordCount"), map: $("#timelineMap"), play: $("#timelinePlayButton"), fit: $("#timelineFitButton"), progress: $("#timelineProgress"), playbackLabel: $("#timelinePlaybackLabel")
  };
  const state = { records: [], filtered: [], map: null, routeLayer: null, placeLayer: null, playbackMarker: null, playbackTimer: null, playbackPoints: [], playing: false };

  function text(value) { return String(value ?? ""); }
  function escapeHtml(value) { return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
  function number(value) { if (value === null || value === undefined || value === "") return null; const result = Number(value); return Number.isFinite(result) ? result : null; }
  function parseDate(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
  function parseLatLng(value) {
    if (typeof value === "string") { const match = value.match(/(?:geo:)?\s*(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?/i); if (match) return { lat: Number(match[1]), lng: Number(match[2]) }; }
    if (value && typeof value === "object") {
      if (number(value.latitude) !== null && number(value.longitude) !== null) return { lat: number(value.latitude), lng: number(value.longitude) };
      if (number(value.latitudeDegrees) !== null && number(value.longitudeDegrees) !== null) return { lat: number(value.latitudeDegrees), lng: number(value.longitudeDegrees) };
      if (number(value.lat) !== null && number(value.lng) !== null) return { lat: number(value.lat), lng: number(value.lng) };
      if (typeof value.latLng === "string") return parseLatLng(value.latLng);
    }
    return null;
  }
  function validPoint(point) { return point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180; }
  function pointFromE7(location) { const latitude = number(location?.latitudeE7); const longitude = number(location?.longitudeE7); if (latitude === null || longitude === null) return null; return { lat: latitude / 1e7, lng: longitude / 1e7, accuracy: number(location.accuracy) }; }
  function pointFromLocation(location) { return parseLatLng(location?.placeLocation || location?.location || location); }
  function isoFromOld(value) { if (!value) return null; if (/^\d+$/.test(String(value))) return new Date(Number(value)).toISOString(); return value; }
  function durationMinutes(start, end) { const a = parseDate(start); const b = parseDate(end); return a && b && b >= a ? (b - a) / 60000 : 0; }
  function cleanMode(value) { return text(value).replace(/^IN_/, "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()).trim(); }
  function haversine(a, b) { const radius = 6371; const rad = Math.PI / 180; const dLat = (b.lat - a.lat) * rad; const dLng = (b.lng - a.lng) * rad; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2; return 2 * radius * Math.asin(Math.sqrt(x)); }
  function pathDistance(points) { let total = 0; for (let i = 1; i < points.length; i += 1) if (validPoint(points[i - 1]) && validPoint(points[i])) total += haversine(points[i - 1], points[i]); return total; }
  function addRecord(records, candidate) { const points = (candidate.points || []).filter(validPoint); if (!points.length && candidate.type !== "visit") return; const start = parseDate(candidate.startTime); const end = parseDate(candidate.endTime) || start; if (!start) return; records.push({ ...candidate, points, startTime: start.toISOString(), endTime: end && end >= start ? end.toISOString() : start.toISOString(), durationMinutes: durationMinutes(start, end), distanceKm: number(candidate.distanceMeters) != null ? number(candidate.distanceMeters) / 1000 : pathDistance(points), mode: cleanMode(candidate.mode) }); }

  function normalizeSemanticSegments(data, warnings) {
    const records = [];
    data.semanticSegments.forEach((segment, index) => {
      const startTime = segment.startTime; const endTime = segment.endTime;
      if (!startTime || !endTime) warnings.push(`semanticSegments[${index}] has no usable startTime/endTime.`);
      if (segment.visit) {
        const top = segment.visit.topCandidate || {};
        const point = pointFromLocation(top);
        if (point) addRecord(records, { type: "visit", startTime, endTime, points: [point], placeId: top.placeId, semanticType: top.semanticType, placeName: top.name || top.placeName, probability: number(segment.visit.probability) ?? number(top.probability) });
        else warnings.push(`semanticSegments[${index}] visit has no usable place coordinate.`);
      } else if (segment.activity) {
        const activity = segment.activity; const start = parseLatLng(activity.start); const end = parseLatLng(activity.end); const points = [start, end].filter(validPoint);
        addRecord(records, { type: "activity", startTime, endTime, points, distanceMeters: activity.distanceMeters, mode: activity.topCandidate?.type, probability: number(activity.topCandidate?.probability) });
      } else if (Array.isArray(segment.timelinePath)) {
        const points = segment.timelinePath.map((entry) => ({ ...parseLatLng(entry.point), time: entry.time })).filter(validPoint);
        addRecord(records, { type: "path", startTime, endTime, points });
      }
    });
    return records;
  }

  function normalizeLegacy(data, warnings) {
    const records = [];
    (data.timelineObjects || []).forEach((entry, index) => {
      const visit = entry.placeVisit;
      if (visit) {
        const loc = visit.location || {};
        const point = pointFromE7(loc) || pointFromLocation(loc);
        addRecord(records, { type: "visit", startTime: visit.duration?.startTimestamp || visit.duration?.startTimestampMs, endTime: visit.duration?.endTimestamp || visit.duration?.endTimestampMs, points: [point].filter(Boolean), placeId: loc.placeId, placeName: loc.name, semanticType: visit.location?.semanticType });
        return;
      }
      const activity = entry.activitySegment;
      if (activity) {
        const start = pointFromE7(activity.startLocation) || pointFromLocation(activity.startLocation);
        const end = pointFromE7(activity.endLocation) || pointFromLocation(activity.endLocation);
        const mode = activity.activityType || activity.activities?.[0]?.activityType;
        addRecord(records, { type: "activity", startTime: activity.duration?.startTimestamp || activity.duration?.startTimestampMs, endTime: activity.duration?.endTimestamp || activity.duration?.endTimestampMs, points: [start, end].filter(Boolean), distanceMeters: activity.distance, mode });
        return;
      }
      warnings.push(`timelineObjects[${index}] has no placeVisit or activitySegment.`);
    });
    return records;
  }

  function normalizeLocations(data, warnings) {
    const points = (data.locations || data).map((location) => {
      const point = pointFromE7(location) || pointFromLocation(location); if (!point) return null; point.time = isoFromOld(location.timestampMs ?? location.timestamp ?? location.time); point.accuracy = number(location.accuracy); return point;
    }).filter((point) => validPoint(point) && point.time);
    if (!points.length) return [];
    points.sort((a, b) => new Date(a.time) - new Date(b.time));
    warnings.push(lang === "en" ? "Raw location points do not contain inferred visit or transport labels." : "원시 위치점에는 추론된 방문지·이동수단 라벨이 없을 수 있습니다.");
    return [{ type: "path", startTime: points[0].time, endTime: points[points.length - 1].time, points, durationMinutes: durationMinutes(points[0].time, points[points.length - 1].time), distanceKm: pathDistance(points), mode: "" }];
  }

  function inspectData(data) {
    const errors = []; const warnings = []; let format = ""; let records = [];
    if (Array.isArray(data)) { if (data.some((item) => item && (item.timestampMs || item.timestamp || item.time || item.latitudeE7 || item.latitudeDegrees || item.latitude))) { format = "locations array"; records = normalizeLocations(data, warnings); } else errors.push(unsupportedMessage()); }
    else if (!data || typeof data !== "object") errors.push(unsupportedMessage());
    else if (Array.isArray(data.semanticSegments)) { format = "semanticSegments"; records = normalizeSemanticSegments(data, warnings); }
    else if (Array.isArray(data.timelineObjects)) { format = "timelineObjects"; records = normalizeLegacy(data, warnings); }
    else if (Array.isArray(data.locations)) { format = "locations"; records = normalizeLocations(data, warnings); }
    else errors.push(unsupportedMessage());
    const pointCount = records.reduce((sum, record) => sum + record.points.length, 0);
    if (format && !records.length) warnings.push(copy.noRecords);
    if (format && records.some((record) => !record.points.length)) warnings.push(lang === "en" ? "Some records have time but no coordinate." : "시간은 있지만 좌표가 없는 기록이 있습니다.");
    return { valid: !errors.length, errors, warnings, format, records, pointCount };
  }
  function unsupportedMessage() { return copy.unsupported; }

  function readFile(file) { return new Promise((resolve, reject) => { if (file.size > 100 * 1024 * 1024) { reject(new Error(copy.tooLarge)); return; } if (/\.zip$/i.test(file.name)) { reject(new Error(lang === "en" ? "ZIP import will be added after direct JSON support." : "ZIP 가져오기는 JSON 직접 불러오기를 안정화한 뒤 추가됩니다.")); return; } if (typeof file.text === "function") file.text().then(resolve, reject); else { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error(copy.invalidJson)); reader.readAsText(file); } }); }
  function setValidation(kind, message, details = []) { els.validation.className = `timeline-validation ${kind ? `is-${kind}` : ""}`; els.validation.querySelector("span:last-child").textContent = message; els.validationDetails.hidden = !details.length; els.validationDetails.innerHTML = details.length ? `<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""; }
  function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
  function formatDate(date) { return date.toISOString().slice(0, 10); }
  function setFileMeta(file, report) { const dates = report.records.flatMap((record) => [parseDate(record.startTime), parseDate(record.endTime)]).filter(Boolean).sort((a, b) => a - b); els.meta.hidden = false; els.meta.innerHTML = `<span><strong>${escapeHtml(copy.file)}</strong> ${escapeHtml(file.name)} · ${formatBytes(file.size)}</span><span><strong>${escapeHtml(copy.format)}</strong> ${escapeHtml(report.format)}</span><span><strong>${report.records.length}</strong> ${escapeHtml(copy.records)}</span><span><strong>${report.pointCount}</strong> ${escapeHtml(copy.points)}</span>${dates.length ? `<span><strong>${formatDate(dates[0])}</strong> → <strong>${formatDate(dates[dates.length - 1])}</strong></span>` : ""}`; }
  function resetDashboard() { els.dashboard.hidden = true; els.reset.disabled = true; state.records = []; state.filtered = []; stopPlayback(); if (state.map) { state.map.remove(); state.map = null; } }
  function loadReport(file, report) { setFileMeta(file, report); els.reset.disabled = false; if (!report.valid) { resetDashboard(); els.meta.hidden = false; setValidation("invalid", report.errors[0], report.errors.slice(1).concat(report.warnings)); return; } if (report.warnings.length) setValidation("warning", copy.warning, report.warnings); else setValidation("valid", copy.valid); state.records = report.records; els.dashboard.hidden = false; els.dataStatus.textContent = `${report.records.length} ${copy.records}`; configureFilters(); initMap(); applyFilters(); }
  async function handleFile(file) { if (!file) return; resetDashboard(); try { const raw = await readFile(file); const data = JSON.parse(raw); loadReport(file, inspectData(data)); } catch (error) { els.meta.hidden = false; els.meta.innerHTML = `<span><strong>${escapeHtml(copy.file)}</strong> ${escapeHtml(file.name)} · ${formatBytes(file.size)}</span>`; setValidation("invalid", error.message || copy.invalidJson); } }

  function configureFilters() { const dates = state.records.flatMap((record) => [parseDate(record.startTime), parseDate(record.endTime)]).filter(Boolean); if (dates.length) { const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates)); els.from.value = formatDate(min); els.to.value = formatDate(max); els.from.min = formatDate(min); els.from.max = formatDate(max); els.to.min = formatDate(min); els.to.max = formatDate(max); } const modes = [...new Set(state.records.map((record) => record.mode).filter(Boolean))].sort(); els.mode.innerHTML = `<option value="all">${escapeHtml(copy.all)}</option>${modes.map((mode) => `<option value="${escapeHtml(mode)}">${escapeHtml(mode)}</option>`).join("")}`; }
  function filterRecords() { const from = els.from.value ? new Date(`${els.from.value}T00:00:00`) : null; const to = els.to.value ? new Date(`${els.to.value}T23:59:59.999`) : null; const type = els.type.value; const mode = els.mode.value; const minDuration = Math.max(0, Number(els.minDuration.value) || 0); return state.records.filter((record) => { const start = parseDate(record.startTime); const end = parseDate(record.endTime) || start; return (!from || end >= from) && (!to || start <= to) && (type === "all" || record.type === type) && (mode === "all" || record.mode === mode) && record.durationMinutes >= minDuration; }); }
  function applyFilters() { state.filtered = filterRecords(); renderStats(); renderInsights(); renderMap(); renderRecords(); }
  function renderStats() { const records = state.filtered; const activities = records.filter((record) => record.type === "activity" || record.type === "path"); const visits = records.filter((record) => record.type === "visit"); const distance = activities.reduce((sum, record) => sum + (record.distanceKm || 0), 0); const movementMinutes = activities.reduce((sum, record) => sum + record.durationMinutes, 0); const stayMinutes = visits.reduce((sum, record) => sum + record.durationMinutes, 0); const speed = movementMinutes > 0 ? distance / (movementMinutes / 60) : 0; const top = topPlaces(visits)[0]; const stats = [[copy.distance, `${distance.toFixed(1)} ${copy.km}`, `${activities.length} ${copy.movement}`], [copy.duration, `${(movementMinutes / 60).toFixed(1)} ${copy.hours}`, `${activities.length} ${copy.entries}`], [copy.stay, `${(stayMinutes / 60).toFixed(1)} ${copy.hours}`, `${visits.length} ${copy.visits}`], [copy.avgSpeed, `${speed.toFixed(1)} km/h`, lang === "en" ? "distance ÷ movement time" : "이동거리 ÷ 이동시간"], [copy.topPlace, top ? escapeHtml(top.name) : copy.notAvailable, top ? `${top.count} ${copy.visits}` : copy.notAvailable]]; els.stats.innerHTML = stats.map(([label, value, note]) => `<article class="timeline-stat"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(note)}</small></article>`).join(""); }
  function topPlaces(visits) { const map = new Map(); visits.forEach((record) => { const point = record.points[0]; const key = record.placeId || (point ? `${point.lat.toFixed(4)},${point.lng.toFixed(4)}` : "unknown"); const name = record.placeName || record.semanticType || key; const existing = map.get(key) || { name, count: 0, minutes: 0, point }; existing.count += 1; existing.minutes += record.durationMinutes; map.set(key, existing); }); return [...map.values()].sort((a, b) => b.count - a.count || b.minutes - a.minutes); }
  function renderInsights() { const modes = new Map(); state.filtered.filter((record) => record.type !== "visit").forEach((record) => { const key = record.mode || copy.noMode; modes.set(key, (modes.get(key) || 0) + (record.distanceKm || 0)); }); const modeRows = [...modes.entries()].sort((a, b) => b[1] - a[1]); const maxMode = Math.max(...modeRows.map(([, value]) => value), 1); els.transport.innerHTML = modeRows.length ? modeRows.map(([name, value]) => `<div class="timeline-bar-row"><span title="${escapeHtml(name)}">${escapeHtml(name)}</span><span class="timeline-bar-track"><span class="timeline-bar-fill" style="width:${(value / maxMode) * 100}%"></span></span><b>${value.toFixed(1)} ${copy.km}</b></div>`).join("") : `<p class="timeline-empty-copy">${escapeHtml(copy.noData)}</p>`; const weekday = Array(7).fill(0); state.filtered.forEach((record) => { const date = parseDate(record.startTime); if (date) weekday[date.getDay()] += 1; }); const maxDay = Math.max(...weekday, 1); els.weekdays.innerHTML = weekday.map((value, index) => `<div class="timeline-weekday-row"><span>${weekdayNames[index]}</span><span class="timeline-bar-track"><span class="timeline-bar-fill" style="width:${(value / maxDay) * 100}%"></span></span><b>${value}</b></div>`).join(""); const places = topPlaces(state.filtered.filter((record) => record.type === "visit")).slice(0, 5); els.places.innerHTML = places.length ? places.map((place) => `<li>${escapeHtml(place.name)}<small>${place.count} ${escapeHtml(copy.visits)} · ${(place.minutes / 60).toFixed(1)} ${escapeHtml(copy.hours)}</small></li>`).join("") : `<li class="timeline-empty-copy">${escapeHtml(copy.noData)}</li>`; }

  function recordTypeLabel(type) { return type === "visit" ? copy.recordVisit : type === "activity" ? copy.recordActivity : copy.recordPath; }
  function formatRecordTime(value) { const date = parseDate(value); return date ? date.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : copy.notAvailable; }
  function renderRecords() { const records = [...state.filtered].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); const visible = records.slice(0, 120); els.recordCount.textContent = records.length ? `${visible.length}/${records.length} ${copy.entries} ${copy.shown}` : ""; els.records.innerHTML = visible.length ? visible.map((record) => { const title = record.placeName || record.semanticType || record.mode || recordTypeLabel(record.type); const details = [recordTypeLabel(record.type), record.mode, record.distanceKm > 0 ? `${record.distanceKm.toFixed(1)} ${copy.km}` : "", record.durationMinutes > 0 ? `${record.durationMinutes.toFixed(0)} ${copy.min}` : ""].filter(Boolean).join(" · "); return `<article class="timeline-record"><time datetime="${escapeHtml(record.startTime)}">${escapeHtml(formatRecordTime(record.startTime))}</time><div><strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong><small>${escapeHtml(details)}</small></div><small class="timeline-record-meta">${escapeHtml(formatRecordTime(record.endTime))}</small></article>`; }).join("") : `<p class="timeline-empty-copy">${escapeHtml(copy.noData)}</p>`; }

  function initMap() { if (state.map || !window.L) return; els.map.innerHTML = ""; state.map = window.L.map(els.map, { zoomControl: true, preferCanvas: true }).setView([36.5, 127.8], 7); window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(state.map); state.routeLayer = window.L.layerGroup().addTo(state.map); state.placeLayer = window.L.layerGroup().addTo(state.map); els.play.disabled = false; els.fit.disabled = false; if (state.map) window.setTimeout(() => state.map.invalidateSize(), 100); }
  function renderMap() { if (!state.map) { if (!window.L) setValidation("warning", copy.noMap); return; } stopPlayback(); state.routeLayer.clearLayers(); state.placeLayer.clearLayers(); const allPoints = state.filtered.flatMap((record) => record.points).filter(validPoint); const pathPoints = state.filtered.filter((record) => record.type !== "visit").flatMap((record) => record.points).filter(validPoint); if (pathPoints.length > 1) window.L.polyline(pathPoints.map((point) => [point.lat, point.lng]), { color: "#38bdf8", weight: 4, opacity: .85 }).addTo(state.routeLayer); state.filtered.filter((record) => record.type === "visit" && record.points[0]).forEach((record) => { const point = record.points[0]; window.L.circleMarker([point.lat, point.lng], { radius: 6, color: "#ef4444", fillColor: "#f87171", fillOpacity: .9 }).bindPopup(`<strong>${escapeHtml(record.placeName || record.semanticType || copy.visit)}</strong><br>${escapeHtml(parseDate(record.startTime)?.toLocaleString(lang === "ko" ? "ko-KR" : "en-US") || "")}`).addTo(state.placeLayer); }); if (allPoints.length) state.map.fitBounds(allPoints.map((point) => [point.lat, point.lng]), { padding: [24, 24], maxZoom: 15 }); els.progress.disabled = pathPoints.length < 2; els.progress.value = 0; state.playbackPoints = pathPoints; els.playbackLabel.textContent = pathPoints.length ? copy.stopped : copy.noData; }
  function stopPlayback() { if (state.playbackTimer) cancelAnimationFrame(state.playbackTimer); state.playbackTimer = null; state.playing = false; els.play.textContent = lang === "en" ? "Play" : "재생"; }
  function ensurePlaybackMarker() { if (!state.playbackMarker) state.playbackMarker = window.L.marker([state.playbackPoints[0].lat, state.playbackPoints[0].lng], { icon: window.L.divIcon({ className: "timeline-route-marker", iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(state.map); return state.playbackMarker; }
  function setPlaybackPosition(value) { if (!state.map || state.playbackPoints.length < 2) return; const progress = Math.max(0, Math.min(1, Number(value) / 1000)); const point = state.playbackPoints[Math.min(state.playbackPoints.length - 1, Math.floor(progress * state.playbackPoints.length))]; ensurePlaybackMarker().setLatLng([point.lat, point.lng]); els.playbackLabel.textContent = `${copy.stopped} · ${Math.round(progress * 100)}%`; }
  function playRoute() { if (!state.map || state.playbackPoints.length < 2) return; if (state.playing) { stopPlayback(); return; } state.playing = true; els.play.textContent = lang === "en" ? "Pause" : "일시정지"; ensurePlaybackMarker(); const started = performance.now(); const duration = Math.max(3500, Math.min(18000, state.playbackPoints.length * 100)); const frame = (now) => { if (!state.playing) return; const progress = Math.min(1, (now - started) / duration); const index = Math.min(state.playbackPoints.length - 1, Math.floor(progress * state.playbackPoints.length)); const point = state.playbackPoints[index]; state.playbackMarker.setLatLng([point.lat, point.lng]); els.progress.value = Math.round(progress * 1000); els.playbackLabel.textContent = `${copy.playback} · ${Math.round(progress * 100)}%`; if (progress < 1) state.playbackTimer = requestAnimationFrame(frame); else { stopPlayback(); els.playbackLabel.textContent = copy.stopped; } }; state.playbackTimer = requestAnimationFrame(frame); }

  els.choose.addEventListener("click", () => els.input.click()); els.input.addEventListener("change", () => handleFile(els.input.files?.[0])); els.reset.addEventListener("click", () => { els.input.value = ""; els.meta.hidden = true; setValidation("", lang === "en" ? "Choose a Timeline JSON file to begin." : "Timeline JSON 파일을 선택하면 시작합니다."); resetDashboard(); }); [els.from, els.to, els.type, els.mode, els.minDuration].forEach((element) => element.addEventListener("input", applyFilters)); els.filterReset.addEventListener("click", () => { configureFilters(); els.type.value = "all"; els.mode.value = "all"; els.minDuration.value = "0"; applyFilters(); }); els.play.addEventListener("click", playRoute); els.progress.addEventListener("input", () => { stopPlayback(); setPlaybackPosition(els.progress.value); }); els.fit.addEventListener("click", () => { if (state.map && state.playbackPoints.length) state.map.fitBounds(state.playbackPoints.map((point) => [point.lat, point.lng]), { padding: [24, 24], maxZoom: 15 }); });
  ["dragenter", "dragover"].forEach((eventName) => els.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); els.dropzone.classList.add("is-dragover"); })); ["dragleave", "drop"].forEach((eventName) => els.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); els.dropzone.classList.remove("is-dragover"); })); els.dropzone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files?.[0])); els.dropzone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.input.click(); } });
}());
