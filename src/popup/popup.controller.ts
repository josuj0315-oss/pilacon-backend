import { Controller, Get } from '@nestjs/common';
import { PopupService } from './popup.service';

@Controller('popups')
export class PopupController {
  constructor(private readonly popupService: PopupService) {}

  @Get('active')
  async getActive() {
    return this.popupService.getActivePopups();
  }
}
