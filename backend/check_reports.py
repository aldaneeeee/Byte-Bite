from app import app, db, Forum_Reports

with app.app_context():
    reports = Forum_Reports.query.all()
    print(f"Found {len(reports)} forum reports")
    for report in reports:
        print(f"Report ID: {report.report_id}, Status: {report.status}, Reason: {report.reason}")