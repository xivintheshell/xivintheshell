import React from 'react'

function TimelineHeader(props) {
	return <div className="timeline-header">
		timeline header
	</div>
}

function TimelineContent(props) {
	return <div className="timeline-content">
		timeline content
	</div>
}

function TimelineMain(props) {
	return <div className="timeline-main" style={{width: "900px"}}>
		<TimelineHeader/>
		<TimelineContent/>
	</div>
}

function FixedLeftColumn(props) {
	return <div className={"timeline-fixedLeftColumn"}>
		timeline left col
	</div>;
}

function FixedRightColumn(props) {
	return <div className={"timeline-fixedRightColumn"}>
		<TimelineMain/>
	</div>
}

class Timeline extends React.Component
{
	render()
	{
		return <div className={"timeline"}>
			<FixedRightColumn/>
		</div>
	}
}

export const timeline = <Timeline />;