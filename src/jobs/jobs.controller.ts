import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JobsService } from './jobs.service';
import { Job } from './job.entity';
import { ApplicationsService } from '../applications/applications.service';

@Controller('jobs')
export class JobsController {
    constructor(
        private readonly jobsService: JobsService,
        private readonly applicationsService: ApplicationsService,
    ) { }

    @Get()
    findAll(): Promise<Job[]> {
        return this.jobsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<Job | null> {
        return this.jobsService.findOne(+id);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    create(@Req() req, @Body() jobData: Partial<Job>): Promise<Job> {
        return this.jobsService.create(req.user.id, jobData);
    }

    @Post(':id/apply')
    @UseGuards(AuthGuard('jwt'))
    apply(
        @Req() req,
        @Param('id') id: string,
        @Body() body: { instructorProfileId: number; message?: string },
    ) {
        return this.applicationsService.apply(req.user.id, +id, body.instructorProfileId, body.message);
    }

    @Get(':id/my-application')
    @UseGuards(AuthGuard('jwt'))
    async getMyApplication(@Req() req, @Param('id') id: string) {
        // 이 부분은 ApplicationsService에 메서드를 추가하거나 직접 쿼리
        return this.applicationsService.findUnique(req.user.id, +id);
    }

    @Patch(':id/close')
    @UseGuards(AuthGuard('jwt'))
    close(@Req() req, @Param('id') id: string) {
        return this.jobsService.closeJob(+id, req.user.id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    update(@Req() req, @Param('id') id: string, @Body() jobData: Partial<Job>): Promise<Job> {
        return this.jobsService.update(+id, req.user.id, jobData);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    remove(@Req() req, @Param('id') id: string): Promise<void> {
        return this.jobsService.remove(+id, req.user.id);
    }
}
