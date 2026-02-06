# Team Schedule Tracker - PTO & On-Call Management

## Overview

The Team Schedule Tracker is a comprehensive application for managing team member PTO (Paid Time Off) requests, on-call schedules, and visualizing team capacity on a weekly basis.

## Features

### 1. Team Member Management
- Add, edit, and remove team members
- Track member status (active/inactive)
- Store contact information and roles

### 2. PTO Tracking
- Submit PTO requests with date ranges
- Support for multiple PTO types (vacation, sick leave, personal, other)
- Automatic approval status
- View all PTO requests in a sortable table

### 3. On-Call Schedule Management
- Create on-call assignments
- Support for primary and backup on-call types
- Date range scheduling
- Notes for additional context

### 4. Weekly Capacity Visualization
- Calculate total team capacity in person-days
- Track PTO impact on capacity
- Visual breakdown with charts
- Weekly summary showing:
  - Total team size
  - Total capacity (person-days)
  - PTO days taken
  - Available capacity
  - Utilization percentage
  - On-call assignments for the week

## API Endpoints

### Team Members

#### List Team Members
```
GET /api/schedule/team
```
Returns all team members.

#### Add Team Member
```
POST /api/schedule/team
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Developer"
}
```

#### Update Team Member
```
PUT /api/schedule/team/:id
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Senior Developer",
  "active": true
}
```

#### Delete Team Member
```
DELETE /api/schedule/team/:id
```

### PTO Requests

#### List PTO Requests
```
GET /api/schedule/pto
```

#### Submit PTO Request
```
POST /api/schedule/pto
Content-Type: application/json

{
  "memberId": "1234567890",
  "memberName": "John Doe",
  "startDate": "2026-02-10",
  "endDate": "2026-02-14",
  "type": "vacation",
  "notes": "Family vacation"
}
```

#### Delete PTO Request
```
DELETE /api/schedule/pto/:id
```

### On-Call Schedules

#### List On-Call Schedules
```
GET /api/schedule/oncall
```

#### Add On-Call Schedule
```
POST /api/schedule/oncall
Content-Type: application/json

{
  "memberId": "1234567890",
  "memberName": "John Doe",
  "startDate": "2026-02-07",
  "endDate": "2026-02-14",
  "type": "primary",
  "notes": "Primary on-call rotation"
}
```

#### Delete On-Call Schedule
```
DELETE /api/schedule/oncall/:id
```

### Weekly Capacity

#### Get Weekly Capacity
```
GET /api/schedule/capacity/:week
```
Where `:week` is a date in YYYY-MM-DD format representing the start of the week (typically Monday).

**Response Example:**
```json
{
  "success": true,
  "data": {
    "weekStart": "2026-02-10",
    "weekEnd": "2026-02-17",
    "totalTeam": 3,
    "totalCapacity": 15,
    "ptoCapacity": 5,
    "availableCapacity": 10,
    "utilizationPercent": 67,
    "onCallCount": 2,
    "teamMembers": [...],
    "ptoDays": [...],
    "onCallAssignments": [...]
  }
}
```

## Frontend UI

Access the schedule tracker at: **http://your-server:3000/schedule**

### Views

1. **Capacity View** (Default)
   - Weekly capacity overview with metrics cards
   - Interactive chart showing capacity breakdown
   - List of PTO and on-call assignments for the selected week
   - Date picker to select different weeks

2. **Team View**
   - Grid display of all team members
   - Add/Edit/Delete functionality
   - Status indicators (Active/Inactive)

3. **PTO View**
   - Table of all PTO requests
   - Add new PTO requests
   - Automatic day calculation
   - Delete functionality

4. **On-Call View**
   - Table of on-call schedules
   - Add new on-call assignments
   - Support for primary/backup designations
   - Notes field for additional information

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vue 3, Tailwind CSS, Chart.js
- **Data Storage**: JSON files (data/schedule/*.json)
- **Architecture**: RESTful API with service layer

## Data Storage

All schedule data is stored in JSON files under `data/schedule/`:
- `team.json` - Team member records
- `pto.json` - PTO requests
- `oncall.json` - On-call schedules

## Capacity Calculation Logic

The weekly capacity calculation works as follows:

1. **Total Capacity** = Number of active team members × 5 working days
2. **PTO Capacity** = Sum of all PTO days that overlap with the selected week
3. **Available Capacity** = Total Capacity - PTO Capacity
4. **Utilization Percent** = (Available Capacity / Total Capacity) × 100

The calculation automatically handles:
- Partial week overlaps (PTO starting or ending mid-week)
- Multiple team members on PTO simultaneously
- Weekend exclusion (assumes 5-day work week)

## Usage Examples

### Example 1: Adding a Team Member
```bash
curl -X POST http://localhost:3000/api/schedule/team \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "Senior Developer"
  }'
```

### Example 2: Submitting PTO
```bash
curl -X POST http://localhost:3000/api/schedule/pto \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "1234567890",
    "memberName": "Alice Johnson",
    "startDate": "2026-02-10",
    "endDate": "2026-02-14",
    "type": "vacation",
    "notes": "Family vacation"
  }'
```

### Example 3: Getting Weekly Capacity
```bash
curl http://localhost:3000/api/schedule/capacity/2026-02-10
```

## Security Considerations

- All API endpoints are subject to rate limiting
- Team member data includes email addresses - ensure proper access controls in production
- Consider adding authentication middleware for sensitive operations
- PTO and on-call data should be protected based on your organization's privacy policies

## Future Enhancements

Potential improvements for the schedule tracker:

1. **Authentication & Authorization**
   - User login system
   - Role-based access control
   - Self-service PTO requests

2. **Notifications**
   - Email notifications for PTO approvals
   - On-call reminders
   - Capacity alerts when below threshold

3. **Advanced Features**
   - PTO approval workflow
   - Calendar integration (iCal, Google Calendar)
   - Historical capacity reporting
   - Export to CSV/PDF

4. **Data Storage**
   - Database integration (PostgreSQL, MongoDB)
   - Data backup and recovery
   - Audit logging

5. **Integrations**
   - Slack notifications
   - JIRA integration for sprint planning
   - PagerDuty integration for on-call

## Troubleshooting

### Issue: UI Not Loading Styles
If the UI appears unstyled, check:
1. Content Security Policy settings in `src/app.js`
2. Network connectivity to CDN resources
3. Browser console for errors

### Issue: API Returning 500 Errors
Check:
1. Server logs for detailed error messages
2. JSON file integrity in `data/schedule/`
3. File permissions on the data directory

### Issue: Capacity Calculation Incorrect
Verify:
1. Date formats are YYYY-MM-DD
2. PTO end dates are inclusive
3. Team members are marked as active

## Contributing

When contributing to the schedule tracker:
1. Follow the existing code style
2. Test all API endpoints
3. Update this documentation
4. Add error handling for edge cases
5. Consider backward compatibility

## License

Copyright © 2026 LexBANK. All rights reserved.
