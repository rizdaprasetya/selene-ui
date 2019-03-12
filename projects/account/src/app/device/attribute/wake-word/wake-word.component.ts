import { Component, Input, OnInit } from '@angular/core';

import { DeviceAttribute, DeviceService} from '../../device.service';
import { Observable } from 'rxjs';


@Component({
  selector: 'account-device-wake-word',
  templateUrl: './wake-word.component.html',
  styleUrls: ['./wake-word.component.scss']
})
export class WakeWordComponent implements OnInit {
    @Input() currentValue: DeviceAttribute;
    public wakeWords$ = new Observable<DeviceAttribute[]>();
    public dialogInstructions = 'Mycroft\'s voice technology is rapidly ' +
        'evolving. Local voices guarantee the most privacy. Premium voices ' +
        'are more natural but require an internet connection.';

    constructor(private deviceService: DeviceService) {
    }

    ngOnInit() {
        this.wakeWords$ = this.deviceService.getWakeWords();
    }
}