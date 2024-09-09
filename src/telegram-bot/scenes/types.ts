import { MyContext } from '../types';
import { Scenes } from 'telegraf';
import { SceneSessionData, WizardContextWizard } from 'telegraf/scenes';
import { WizardSessionData } from 'telegraf/src/scenes/wizard/context';

export type CastMyContext<T> = MyContext & {
    scene: Scenes.SceneContextScene<CastMyContext<T>, SceneSessionData & { state: T}> & {
        get state(): T
    }
}

export type CastMyWizardContext<T> = MyContext & {
    scene: Scenes.SceneContextScene<CastMyWizardContext<T>, WizardSessionData & { state: T}> & {
        get state(): T
    },
    wizard: WizardContextWizard<CastMyWizardContext<T>>
}