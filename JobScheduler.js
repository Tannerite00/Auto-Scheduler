import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import GoogleMapsClient from 'c/googleMapsClient';
import CalendarClient from 'c/calendarClient';

export default class JobScheduler extends LightningElement {
    @track jobs;
    @track officeLocation;
    @track maxTravelTime = 20;

    handleOfficeLocationChange(event) {
        this.officeLocation = event.target.value;
    }

    handleMaxTravelTimeChange(event) {
        this.maxTravelTime = event.target.value;
    }

    handleJobSubmission(event) {
        event.preventDefault();
        const fields = event.target.elements;
        const job = {
            jobName: fields.jobName.value,
            jobLocation: fields.jobLocation.value
        };
        this.jobs = [...this.jobs, job];
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Job Added',
                message: `${job.jobName} was added to the list of jobs`,
                variant: 'success'
            })
        );
    }

    handleJobScheduling() {
        const options = {
            officeLocation: this.officeLocation,
            jobs: this.jobs,
            maxTravelTime: this.maxTravelTime
        };

        GoogleMapsClient.getDistanceMatrix(options.officeLocation, options.jobs)
        .then(response => {
            const { rows } = response.data;
            const distances = rows.map(row => row.elements[0].duration.value);

            options.jobs.sort((a, b) => distances[options.jobs.indexOf(a)] - distances[options.jobs.indexOf(b)]);

            const scheduledJobs = [];
            let time = 0;

            for (const job of options.jobs) {
                if (distances[options.jobs.indexOf(job)] > options.maxTravelTime * 60) {
                    const freeSlot = CalendarClient.findFreeSlot(time, options.maxTravelTime * 60);
                    if (freeSlot) {
                        time = freeSlot.start;
                        scheduledJobs.push({
                            job,
                            startTime: freeSlot.start
                        });
                    } else {
                        time = 0;
                        scheduledJobs.push({
                            job,
                            startTime: time
                        });
                    }
                } else {
                    time += distances[options.jobs.indexOf(job)];
                    scheduledJobs.push({
                        job,
                        startTime: time
                    });
                }
            }

            console.log('Scheduled Jobs:', scheduledJobs);
        });
    }
}
