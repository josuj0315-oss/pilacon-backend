import { Controller, Post, Get, Body, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@UseGuards(AuthGuard('jwt'))
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post(':jobId')
    apply(
        @Req() req,
        @Param('jobId') jobId: string,
        @Body() body: { instructorProfileId: number; message?: string },
    ) {
        return this.applicationsService.apply(req.user.id, +jobId, body.instructorProfileId, body.message);
    }

    @Get('my')
    findMyApplications(@Req() req) {
        return this.applicationsService.findMyApplications(req.user.id);
    }

    @Get('job/:jobId')
    findByJobId(@Param('jobId') jobId: string) {
        return this.applicationsService.findByJobId(+jobId);
    }

    @Patch(':id/view')
    markAsViewed(@Req() req, @Param('id') id: string) {
        return this.applicationsService.markAsViewed(+id, req.user.id);
    }

    @Patch(':id/cancel')
    cancel(
        @Req() req,
        @Param('id') id: string,
        @Body() body: { reason: string; detail?: string },
    ) {
        return this.applicationsService.cancel(+id, req.user.id, body.reason, body.detail);
    }

    @Patch('accept/:id')
    accept(@Req() req, @Param('id') id: string) {
        console.log('ACCEPT REQUEST:', id);
        return this.applicationsService.accept(+id, req.user.id);
    }
}
