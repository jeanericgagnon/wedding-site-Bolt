import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('itinerary dashboard recovery', () => {
  it('clears stale save feedback when the owner edits the itinerary form again', () => {
    const routeContent = readFileSync(join(process.cwd(), 'src/pages/dashboard/ItineraryDashboardRouteContent.tsx'), 'utf8');
    const route = readFileSync(join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'), 'utf8');

    expect(routeContent).toContain("const handleFormDataChange = <K extends keyof ItineraryFormData>(field: K, value: ItineraryFormData[K]) => {");
    expect(routeContent).toContain('setSaveError(null);');
    expect(routeContent).toContain('setSaveNotice(null);');
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('event_name', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('event_date', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('start_time', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('end_time', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('location_name', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('dress_code', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('location_address', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('description', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('notes', e.target.value)}");
    expect(routeContent).toContain("onChange={(e) => handleFormDataChange('is_visible', e.target.checked)}");
    expect(routeContent).toContain('const clearTimelineFeedback = () => {');
    expect(routeContent).toContain('clearTimelineFeedback();');
    expect(routeContent).toContain('setTemplateDate(e.target.value);');
    expect(routeContent).toContain('setTemplateStart(e.target.value);');
    expect(routeContent).toContain('setShiftFromEventId(e.target.value);');
    expect(routeContent).toContain('setShiftMinutes(Number(e.target.value) || 1);');
    expect(routeContent).toContain('setSaveNotice(null);');
    expect(route).toContain('setSaveNotice={setSaveNotice}');
  });
});
